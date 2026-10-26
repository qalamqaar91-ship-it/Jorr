import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

type R = { id: string; sender_id: string; receiver_id: string; status: string };

export default function Requests() {
  const { t } = useI18n(); const { session } = useAuth(); const uid = session!.user.id;
  const [rows, setRows] = useState<R[]>([]), [names, setNames] = useState<Record<string, string>>({}), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data } = await supabase.from("rishta_requests").select("id,sender_id,receiver_id,status").order("created_at", { ascending: false });
    const list = data ?? []; setRows(list);
    const ids = [...new Set(list.map(r => (r.sender_id === uid ? r.receiver_id : r.sender_id)))];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("user_id,display_name").in("user_id", ids);
      setNames(Object.fromEntries((ps ?? []).map(p => [p.user_id, p.display_name])));
    }
  }, [uid]);
  useEffect(() => { load(); }, [load]);
  async function setStatus(id: string, status: string) {
    setErr("");
    const { error } = await supabase.from("rishta_requests").update({ status }).eq("id", id);
    if (error) setErr(t.error); else load();
  }
  const section = (title: string, list: R[], incoming: boolean) => (
    <section><h2>{title}</h2>{list.length === 0 ? <p>{t.empty}</p> : list.map(r => (
      <div key={r.id} className="tile line">
        <span>{names[incoming ? r.sender_id : r.receiver_id] ?? "—"} · <em>{r.status}</em></span>
        {r.status === "pending" && (incoming
          ? <span className="row"><button className="btn" onClick={() => setStatus(r.id, "accepted")}>{t.accept}</button><button className="btn alt" onClick={() => setStatus(r.id, "rejected")}>{t.reject}</button></span>
          : <button className="btn alt" onClick={() => setStatus(r.id, "withdrawn")}>{t.withdraw}</button>)}
      </div>))}</section>);
  return (<><h1>{t.requests}</h1>{err && <p role="alert" className="err">{err}</p>}
    {section(t.received, rows.filter(r => r.receiver_id === uid), true)}{section(t.sent, rows.filter(r => r.sender_id === uid), false)}</>);
}
