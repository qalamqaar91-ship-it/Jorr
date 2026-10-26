import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

type Pr = { user_id: string; display_name: string };
type Rp = { id: string; target_user_id: string; reason: string };
type Ph = { id: string; user_id: string; storage_path: string; url?: string };

export default function Admin() {
  const { t } = useI18n(); const { session, role } = useAuth();
  const [profiles, setProfiles] = useState<Pr[]>([]), [reports, setReports] = useState<Rp[]>([]), [photos, setPhotos] = useState<Ph[]>([]), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("profiles").select("user_id,display_name").eq("status", "pending"),
      supabase.from("reports").select("id,target_user_id,reason").eq("status", "open"),
      supabase.from("photos").select("id,user_id,storage_path").eq("approved", false),
    ]);
    setProfiles(a.data ?? []); setReports(b.data ?? []);
    setPhotos(await Promise.all((c.data ?? []).map(async p => ({ ...p, url: (await supabase.storage.from("photos").createSignedUrl(p.storage_path, 300)).data?.signedUrl }))));
  }, []);
  useEffect(() => { if (role !== "user") load(); }, [role, load]);
  if (role === "user") return <p className="card">{t.notAllowed}</p>;

  async function run(action: string, target: string, p: PromiseLike<{ error: unknown }>) {
    setErr(""); const { error } = await p;
    if (error) return setErr(t.error);
    await supabase.from("audit_log").insert({ actor_id: session!.user.id, action, target });
    load();
  }
  return (
    <>
      <h1>{t.admin}</h1>{err && <p role="alert" className="err">{err}</p>}
      <h2>{t.pendingProfiles}</h2>{profiles.length === 0 && <p>{t.empty}</p>}
      {profiles.map(p => <div key={p.user_id} className="tile line"><span>{p.display_name}</span><span className="row">
        <button className="btn" onClick={() => run("profile_approved", p.user_id, supabase.from("profiles").update({ status: "approved" }).eq("user_id", p.user_id))}>{t.approve}</button>
        <button className="btn alt" onClick={() => run("profile_rejected", p.user_id, supabase.from("profiles").update({ status: "rejected" }).eq("user_id", p.user_id))}>{t.reject}</button></span></div>)}
      <h2>{t.pendingPhotos}</h2>{photos.length === 0 && <p>{t.empty}</p>}
      {photos.map(p => <div key={p.id} className="tile line">{p.url && <img className="thumb" src={p.url} alt="" />}<span className="row">
        <button className="btn" onClick={() => run("photo_approved", p.id, supabase.from("photos").update({ approved: true }).eq("id", p.id))}>{t.approve}</button>
        <button className="btn alt" onClick={() => run("photo_rejected", p.id, supabase.from("photos").delete().eq("id", p.id))}>{t.reject}</button></span></div>)}
      <h2>{t.openReports}</h2>{reports.length === 0 && <p>{t.empty}</p>}
      {reports.map(r => <div key={r.id} className="tile line"><span>{r.reason}</span><span className="row">
        <button className="btn" onClick={() => run("report_reviewed", r.id, supabase.from("reports").update({ status: "reviewed", handled_by: session!.user.id }).eq("id", r.id))}>{t.approve}</button>
        <button className="btn alt" onClick={() => run("report_dismissed", r.id, supabase.from("reports").update({ status: "dismissed", handled_by: session!.user.id }).eq("id", r.id))}>{t.dismiss}</button></span></div>)}
    </>
  );
}
