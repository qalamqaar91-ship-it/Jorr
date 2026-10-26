import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

// The page is only a form. All checks (secret, verified email, one-time flag) run in the server function.
export default function AdminSetup() {
  const { t } = useI18n(); const { session } = useAuth();
  const [secret, setSecret] = useState(""), [pw, setPw] = useState(""), [msg, setMsg] = useState(""), [ok, setOk] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg("");
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/.netlify/functions/admin-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ secret, newPassword: pw }),
    });
    if (res.ok) setOk(true); else setMsg(t.error);
  }
  if (!session) return <p className="card">{t.setupHint}</p>;
  return (
    <form className="card" onSubmit={submit}>
      <h1>{t.setupTitle}</h1>
      <p>{t.setupHint}</p>
      <label>{t.setupSecret}<input type="password" autoComplete="off" required value={secret} onChange={e => setSecret(e.target.value)} /></label>
      <label>{t.newPassword}<input type="password" autoComplete="new-password" minLength={12} required value={pw} onChange={e => setPw(e.target.value)} /></label>
      {msg && <p role="alert" className="err">{msg}</p>}
      {ok && <p role="status" className="ok">{t.setupDone}</p>}
      <button className="btn">{t.setupTitle}</button>
    </form>
  );
}
