import type { Handler } from "@netlify/functions";
import { timingSafeEqual } from "node:crypto";
import { admin, audit, json, userFromToken } from "./_lib/server";

const NOT_AVAILABLE = json(404, { error: "Not found" });
const FAIL = json(403, { error: "Setup not permitted" }); // deliberately generic

function strong(pw: string) {
  return pw.length >= 12 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return NOT_AVAILABLE;
  const { ADMIN_SETUP_SECRET, ADMIN_SETUP_EMAIL } = process.env;
  if (!ADMIN_SETUP_SECRET || !ADMIN_SETUP_EMAIL) return NOT_AVAILABLE; // setup disabled when env vars are removed

  const db = admin();
  const { data: state } = await db.from("system_state").select("value").eq("key", "admin_setup_completed").maybeSingle();
  if (state?.value === true) return NOT_AVAILABLE; // one-time only

  // rate limit: 5 attempts per hour across the whole setup flow
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("setup_attempts").select("*", { count: "exact", head: true }).gte("attempted_at", since);
  if ((count ?? 0) >= 5) return json(429, { error: "Too many attempts" });
  await db.from("setup_attempts").insert({});

  const user = await userFromToken(event.headers.authorization);
  let body: { secret?: string; newPassword?: string } = {};
  try { body = JSON.parse(event.body ?? "{}"); } catch { return FAIL; }

  const emailOk = !!user?.email && user.email.toLowerCase() === ADMIN_SETUP_EMAIL.toLowerCase();
  const verified = !!user?.email_confirmed_at;               // email must be verified by Supabase
  const secretOk = typeof body.secret === "string" && safeEqual(body.secret, ADMIN_SETUP_SECRET);
  if (!user || !emailOk || !verified || !secretOk) return FAIL;
  if (!body.newPassword || !strong(body.newPassword)) return json(400, { error: "Password too weak" });

  const { error: pwErr } = await db.auth.admin.updateUserById(user.id, { password: body.newPassword });
  if (pwErr) return json(500, { error: "Setup failed" });
  await db.from("user_roles").upsert({ user_id: user.id, role: "super_admin", updated_at: new Date().toISOString() });
  await db.from("system_state").update({ value: true, updated_at: new Date().toISOString() }).eq("key", "admin_setup_completed");
  await db.from("profiles").update({ status: "approved" }).eq("user_id", user.id);
  await audit(user.id, "admin_setup_completed", user.id);
  return json(200, { ok: true });
};
