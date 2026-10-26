import { createClient } from "@supabase/supabase-js";

export const admin = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export const json = (status: number, body: unknown) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

export async function userFromToken(authHeader: string | undefined) {
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error ? null : data.user;
}

/** Use at the top of every admin-only function. Authorization is checked in the database, not the browser. */
export async function requireRole(authHeader: string | undefined, allowed: Array<"moderator" | "super_admin">) {
  const user = await userFromToken(authHeader);
  if (!user) return null;
  const { data } = await admin().from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  return data && (allowed as string[]).includes(data.role) ? user : null;
}

export async function audit(actorId: string, action: string, target?: string, details?: Record<string, unknown>) {
  await admin().from("audit_log").insert({ actor_id: actorId, action, target, details });
}
