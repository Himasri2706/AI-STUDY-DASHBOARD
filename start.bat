@echo off
echo ========================================================
echo Launching AI Study Dashboard...
echo ========================================================
echo.
echo Installing Backend Requirements (this might take a minute)...
cd backend
pip install -r requirements.txt

echo.
echo Starting the AI Backend server in a new window...
start "AI Study Backend (Do not close)" cmd /c "python app.py"

echo.
echo Starting the React Frontend server in a new window...
cd ../frontend
start "AI Study Frontend (Do not close)" cmd /c "npm install && npm run dev"

echo.
echo Starting n8n Automation Server in a new window...
cd ..
start "n8n Server (Do not close)" cmd /c "npx -y n8n"

echo.
echo ========================================================
echo Done! Three new windows have opened. 
echo - The Backend is running on port 5000.
echo - The Frontend is starting up on port 5173.
echo - n8n is starting up on port 5678.
echo ========================================================
pause
