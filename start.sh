#!/bin/sh
[ -f .env ] || cp .env.example .env
echo "Open .env, paste your Supabase values, save, then press Enter."
${EDITOR:-nano} .env
npm install && npm run typecheck && npm run dev
