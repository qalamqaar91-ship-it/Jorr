import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useI18n } from "../lib/i18n";

function ageOf(dob: string) {
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}
const Msg = ({ kind, text }: { kind: "ok" | "err"; text: string }) =>
  text ? <p role={kind === "err" ? "alert" : "status"} className={kind}>{text}</p> : null;

export function Login() {
  const { t } = useI18n(); const nav = useNavigate();
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(t.error); else nav("/");
  }
  return (
    <form className="card" onSubmit={submit}>
      <h1>{t.logIn}</h1>
      <label>{t.email}<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>{t.password}<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <Msg kind="err" text={err} />
      <button className="btn" disabled={busy}>{t.logIn}</button>
      <p><Link to="/forgot">{t.forgot}</Link> · <Link to="/signup">{t.getStarted}</Link></p>
    </form>
  );
}

export function Signup() {
  const { t } = useI18n();
  const [f, setF] = useState({ email: "", password: "", name: "", dob: "", consent: false });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>({ kind: "ok", text: "" });
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg({ kind: "ok", text: "" });
    if (ageOf(f.dob) < 18) return setMsg({ kind: "err", text: t.under18 });
    if (f.password.length < 12) return setMsg({ kind: "err", text: t.pwRule });
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { emailRedirectTo: window.location.origin, data: { display_name: f.name, dob: f.dob, consent: f.consent } },
    });
    setBusy(false);
    // Same message either way: do not reveal whether the email is already registered.
    setMsg(error && !/registered|exists/i.test(error.message) ? { kind: "err", text: error.message } : { kind: "ok", text: t.checkEmail });
  }
  return (
    <form className="card" onSubmit={submit}>
      <h1>{t.signUp}</h1>
      <label>{t.displayName}<input required maxLength={60} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>{t.dob}<input type="date" required value={f.dob} onChange={e => setF({ ...f, dob: e.target.value })} /></label>
      <label>{t.email}<input type="email" autoComplete="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label>{t.password}<input type="password" autoComplete="new-password" minLength={12} required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /><small>{t.pwRule}</small></label>
      <label className="check"><input type="checkbox" required checked={f.consent} onChange={e => setF({ ...f, consent: e.target.checked })} />{t.consent}</label>
      <Msg {...msg} />
      <button className="btn" disabled={busy}>{t.signUp}</button>
    </form>
  );
}

export function Forgot() {
  const { t } = useI18n(); const [email, setEmail] = useState(""), [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` });
    setDone(true); // always the same response
  }
  return (
    <form className="card" onSubmit={submit}>
      <h1>{t.forgot}</h1>
      <label>{t.email}<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <Msg kind="ok" text={done ? t.resetSent : ""} />
      <button className="btn">{t.sendReset}</button>
    </form>
  );
}

export function ResetPassword() {
  const { t } = useI18n(); const nav = useNavigate();
  const [pw, setPw] = useState(""), [err, setErr] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 12) return setErr(t.pwRule);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) setErr(t.error); else nav("/login");
  }
  return (
    <form className="card" onSubmit={submit}>
      <h1>{t.newPassword}</h1>
      <label>{t.newPassword}<input type="password" autoComplete="new-password" minLength={12} required value={pw} onChange={e => setPw(e.target.value)} /></label>
      <Msg kind="err" text={err} />
      <button className="btn">{t.savePassword}</button>
    </form>
  );
}
