import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useI18n } from "./lib/i18n";
import { useAuth } from "./lib/auth";
import { supabase, isConfigured } from "./lib/supabase";
import Home from "./pages/Home";
import { Login, Signup, Forgot, ResetPassword } from "./pages/Auth";
import AdminSetup from "./pages/AdminSetup";
import Profile from "./pages/Profile";
import Browse from "./pages/Browse";
import Requests from "./pages/Requests";
import Admin from "./pages/Admin";
import Page from "./pages/Page";
import type { ReactElement } from "react";

function Guard({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth(); const { t } = useI18n();
  if (loading) return <p>{t.loading}</p>;
  return session ? children : <Navigate to="/login" replace />;
}

// Replace by putting your file at /public/logo.png and setting LOGO_SRC (later: admin setting `logo_url`).
const LOGO_SRC = "/logo-placeholder.svg";

export default function App() {
  const { t, toggle } = useI18n();
  const { session, role } = useAuth();
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="bar">
        <Link to="/" className="brand"><img src={LOGO_SRC} alt="" width={36} height={36} /><span>{t.brand}</span></Link>
        <nav>
          <button className="ghost" onClick={toggle} lang={t.language === "اردو" ? "ur" : "en"}>{t.language}</button>
          {session && <><Link className="ghost" to="/browse">{t.browse}</Link><Link className="ghost" to="/requests">{t.requests}</Link><Link className="ghost" to="/profile">{t.myProfile}</Link>{role !== "user" && <Link className="ghost" to="/admin">{t.admin}</Link>}</>}
          {session
            ? <button className="ghost" onClick={() => supabase.auth.signOut()}>{t.logOut}</button>
            : <Link className="ghost" to="/login">{t.logIn}</Link>}
        </nav>
      </header>
      {!isConfigured && <p role="alert" className="notice">{t.notConfigured}</p>}
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<ResetPassword />} />
          <Route path="/setup/admin" element={<AdminSetup />} />
          <Route path="/profile" element={<Guard><Profile /></Guard>} />
          <Route path="/browse" element={<Guard><Browse /></Guard>} />
          <Route path="/requests" element={<Guard><Requests /></Guard>} />
          <Route path="/admin" element={<Guard><Admin /></Guard>} />
          <Route path="/p/:slug" element={<Page />} />
        </Routes>
      </main>
      <footer className="foot"><Link to="/p/privacy">{t.privacy}</Link> · <Link to="/p/terms">{t.terms}</Link> · <Link to="/p/safety">{t.safety}</Link></footer>
    </>
  );
}
