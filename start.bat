@echo off

:: Ensure the script runs in the correct project folder no matter where it's launched from
cd /d "%~dp0"

echo Starting NoteRootAI Services...
echo The browser will open automatically once services are ready (~20 seconds)...

:: Start a background process to open the browser after a short delay
start "" cmd /c "timeout /t 20 /nobreak >nul && start http://localhost:5173"

:: Run the concurrently command to start all servers
npm run dev
