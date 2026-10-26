@echo off
if not exist .env copy .env.example .env
echo.
echo 1) Notepad khulega. Apni 4 Supabase values paste karein, Save karein, Notepad band karein.
notepad .env
call npm install
call npm run typecheck
call npm run dev
pause
