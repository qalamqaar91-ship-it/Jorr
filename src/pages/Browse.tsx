import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

type P = { user_id: string; display_name: string; gender: string | null; about: string | null; province_id: number | null };
type Prov = { id: number; name_en: string; name_ur: string | null };

export default function Browse() {
  const { t, lang } = useI18n(); const { session } = useAuth(); const uid = session!.user.id;
  const [rows, setRows] = useState<P[]>([]), [provs, setProvs] = useState<Prov[]>([]);
  const [gender, setGender] = useState(""), [prov, setProv] = useState(""), [msg, setMsg] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => { supabase.from("provinces").select("id,name_en,name_ur").eq("active", true).then(({ data }) => setProvs(data ?? [])); }, []);
  useEffect(() => {
    setLoading(true);
    let q = supabase.from("profiles").select("user_id,display_name,gender,about,province_id").eq("status", "approved").neq("user_id", uid);
    if (gender) q = q.eq("gender", gender);
    if (prov) q = q.eq("province_id", Number(prov));
    q.limit(30).then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, [uid, gender, prov]);

  async function act(kind: "request" | "fav" | "block" | "report", id: string) {
    setMsg("");
    let error: unknown;
    if (kind === "request") error = (await supabase.from("rishta_requests").insert({ sender_id: uid, receiver_id: id })).error;
    else if (kind === "fav") error = (await supabase.from("favourites").upsert({ user_id: uid, target_id: id })).error;
    else if (kind === "block") {
      error = (await supabase.from("blocks").upsert({ blocker_id: uid, blocked_id: id })).error;
      if (!error) setRows(r => r.filter(x => x.user_id !== id));
    } else {
      const reason = window.prompt(t.reportReason)?.trim();
      if (!reason) return;
      error = (await supabase.from("reports").insert({ reporter_id: uid, target_user_id: id, reason })).error;
    }
    setMsg(error ? t.error : t.done);
  }
  const provName = (id: number | null) => { const p = provs.find(x => x.id === id); return p ? (lang === "ur" && p.name_ur ? p.name_ur : p.name_en) : ""; };
  return (
    <>
      <h1>{t.browse}</h1>
      <div className="row">
        <label>{t.gender}<select value={gender} onChange={e => setGender(e.target.value)}><option value="">{t.any}</option><option value="male">{t.male}</option><option value="female">{t.female}</option></select></label>
        <label>{t.province}<select value={prov} onChange={e => setProv(e.target.value)}><option value="">{t.any}</option>{provs.map(p => <option key={p.id} value={p.id}>{lang === "ur" && p.name_ur ? p.name_ur : p.name_en}</option>)}</select></label>
      </div>
      {msg && <p role="status" className="ok">{msg}</p>}
      {loading ? <p>{t.loading}</p> : rows.length === 0 ? <p>{t.empty}</p> : (
        <div className="grid">{rows.map(p => (
          <article key={p.user_id} className="tile">
            <h2>{p.display_name}</h2><p className="muted">{provName(p.province_id)}</p>
            <p>{p.about?.slice(0, 160)}</p>
            <div className="row">
              <button className="btn" onClick={() => act("request", p.user_id)}>{t.sendRequest}</button>
              <button className="btn alt" onClick={() => act("fav", p.user_id)}>{t.favourite}</button>
              <button className="link" onClick={() => act("block", p.user_id)}>{t.block}</button>
              <button className="link" onClick={() => act("report", p.user_id)}>{t.report}</button>
            </div>
          </article>))}</div>)}
    </>
  );
}
