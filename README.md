# Jorr (جوڑ) - Phases 1-2

**Status: written, NOT yet installed, built, deployed or tested (phases 1-3).** Nothing here has been run.

## Included so far
- React + TypeScript + Vite app, English/Urdu with RTL, replaceable logo (`public/logo-placeholder.svg`, set in `src/App.tsx`)
- Signup (18+ and consent enforced in browser AND database trigger), login, forgot/reset password
- `supabase/migrations/0001_schema.sql` tables, roles, triggers; `0002_rls.sql` row-level security and private photo bucket
- `netlify/functions/admin-setup.ts` one-time super-admin setup; `_lib/server.ts` helpers for admin-only functions

## Setup
1. Supabase: create a project. In SQL Editor run `0001_schema.sql` then `0002_rls.sql`.
2. Supabase > Authentication: enable email confirmations; set Site URL and add `https://YOUR-SITE.netlify.app/**` and `http://localhost:5173/**` as redirect URLs.
3. Local: `cp .env.example .env`, fill values, `npm install`, `npm run dev`.
4. Netlify: connect the repo; add all variables from `.env.example` in Site settings > Environment variables (service role key and setup secret as secret values).
5. First admin: set `ADMIN_SETUP_EMAIL` and `ADMIN_SETUP_SECRET`, deploy, sign up with that email, confirm it, log in, open `/setup/admin`, enter the secret and a strong new password. Then **delete both variables** and redeploy. Setup is also locked permanently in the database.

## Phase 3 (added)
- Profile editor + private photo upload, browse with filters, favourite/block/report, rishta requests inbox, admin review panel (profiles, photos, reports), editable legal pages at `/p/privacy` etc.
- Run `0003_phase3.sql` after `0002` (admin photo viewing, daily request limit, audit inserts).

## Known gaps
- Other members' photos are not displayed yet (needs a signed-URL server function). Admin recovery, phone OTP, city list, partner preferences, favourites list page and a content-page editor are not written yet.
- Server-side rate limiting beyond the setup endpoint relies on Supabase Auth limits for now.
- Legal pages are DRAFT placeholders needing professional review in Pakistan.
