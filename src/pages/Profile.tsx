import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

type Prov = { id: number; name_en: string; name_ur: string | null };
type Photo = { id: string; storage_path: string; approved: boolean; url?: string };
const MAX_PHOTOS = 5;

export default function Profile() {
  const { t, lang } = useI18n(); const { session } = useAuth();
  const uid = session!.user.id;
  const [f, setF] = useState<Record<string, string>>({}), [status, setStatus] = useState(""), [provs, setProvs] = useState<Prov[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]), [msg, setMsg] = useState(""), [err, setErr] = useState("");
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function loadPhotos() {
    const { data } = await supabase.from("photos").select("id,storage_path,approved").eq("user_id", uid).order("created_at");
    const list = await Promise.all((data ?? []).map(async p => ({ ...p, url: (await supabase.storage.from("photos").createSignedUrl(p.storage_path, 300)).data?.signedUrl })));
    setPhotos(list);
  }
  useEffect(() => {
    supabase.from("provinces").select("id,name_en,name_ur").eq("active", true).then(({ data }) => setProvs(data ?? []));
    supabase.from("profiles").select("*").eq("user_id", uid).single().then(({ data }) => {
      if (!data) return; setStatus(data.status);
      setF({ display_name: data.display_name ?? "", gender: data.gender ?? "", province_id: String(data.province_id ?? ""), about: data.about ?? "",
        family_intro: data.family_intro ?? "", religious_prefs: data.religious_prefs ?? "", visibility: data.visibility });
    });
    loadPhotos();
  }, [uid]);

  async function save(e: FormEvent) {
    e.preventDefault(); setMsg(""); setErr("");
    const { error } = await supabase.from("profiles").update({
      display_name: f.display_name, gender: f.gender || null, province_id: f.province_id ? Number(f.province_id) : null,
      about: f.about || null, family_intro: f.family_intro || null, religious_prefs: f.religious_prefs || null, visibility: f.visibility,
    }).eq("user_id", uid);
    if (error) setErr(t.error); else setMsg(t.done);
  }
  async function upload(file: File | undefined) {
    setErr("");
    if (!file || photos.length >= MAX_PHOTOS) return;
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("photos").upload(path, file, { contentType: file.type });
    if (up.error) return setErr(t.error);
    const ins = await supabase.from("photos").insert({ user_id: uid, storage_path: path });
    if (ins.error) { await supabase.storage.from("photos").remove([path]); return setErr(t.error); }
    loadPhotos();
  }
  async function remove(p: Photo) {
    await supabase.from("photos").delete().eq("id", p.id);
    await supabase.storage.from("photos").remove([p.storage_path]); loadPhotos();
  }
  return (
    <form className="card wide" onSubmit={save}>
      <h1>{t.myProfile}</h1>
      <p>{t.statusLabel}: <strong>{status}</strong></p>
      <label>{t.displayName}<input required maxLength={60} value={f.display_name ?? ""} onChange={set("display_name")} /></label>
      <label>{t.gender}<select value={f.gender ?? ""} onChange={set("gender")}><option value="">—</option><option value="male">{t.male}</option><option value="female">{t.female}</option></select></label>
      <label>{t.province}<select value={f.province_id ?? ""} onChange={set("province_id")}><option value="">—</option>{provs.map(p => <option key={p.id} value={p.id}>{lang === "ur" && p.name_ur ? p.name_ur : p.name_en}</option>)}</select></label>
      <label>{t.about}<textarea rows={4} maxLength={1500} value={f.about ?? ""} onChange={set("about")} /></label>
      <label>{t.family}<textarea rows={3} maxLength={1500} value={f.family_intro ?? ""} onChange={set("family_intro")} /></label>
      <label>{t.religion}<textarea rows={2} maxLength={500} value={f.religious_prefs ?? ""} onChange={set("religious_prefs")} /></label>
      <label>{t.visibility}<select value={f.visibility ?? "requests_only"} onChange={set("visibility")}>
        <option value="public_members">{t.visPublic}</option><option value="requests_only">{t.visReq}</option><option value="hidden">{t.visHidden}</option></select></label>
      {err && <p role="alert" className="err">{err}</p>}{msg && <p role="status" className="ok">{msg}</p>}
      <button className="btn">{t.save}</button>
      <h2>{t.addPhoto}</h2><p>{t.photoNote}</p>
      <div className="thumbs">{photos.map(p => (
        <figure key={p.id}>{p.url && <img src={p.url} alt="" />}<figcaption>{p.approved ? "✓" : "…"} <button type="button" className="link" onClick={() => remove(p)}>×</button></figcaption></figure>))}</div>
      {photos.length < MAX_PHOTOS && <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { upload(e.target.files?.[0]); e.target.value = ""; }} />}
    </form>
  );
}
