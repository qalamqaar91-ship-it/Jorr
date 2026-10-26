import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Role = "user" | "moderator" | "super_admin";
const AuthCtx = createContext<{ session: Session | null; role: Role; loading: boolean }>(null as never);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // UI hint only. Real authorization is enforced by RLS and server functions.
  useEffect(() => {
    if (!session) { setRole("user"); return; }
    supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle()
      .then(({ data }) => setRole((data?.role as Role) ?? "user"));
  }, [session]);

  return <AuthCtx.Provider value={{ session, role, loading }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
