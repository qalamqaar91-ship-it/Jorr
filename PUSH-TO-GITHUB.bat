@echo off
where git >nul 2>nul
if errorlevel 1 (
  echo Git install nahi hai. Download page khul raha hai. Install karke yeh file dobara chalayein.
  start https://git-scm.com/download/win
  pause
  exit /b
)
if not exist .git git init
git add .
git -c user.name=Jorr -c user.email=jorr@example.com commit -m "Jorr full upload"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/qalamqaar91-ship-it/Jorr.git
git push -u -f origin main
echo.
echo Agar upar error nahi hai to upload ho gaya. Ab Netlify mein deploy dekhein.
pause
