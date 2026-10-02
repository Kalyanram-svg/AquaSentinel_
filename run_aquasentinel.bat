@echo off
title AquaSentinel Underwater Intelligence Platform
echo ===============================================================================
echo                AQUASENTINEL UNDERWATER INTELLIGENCE PLATFORM
echo          Smart India Hackathon SIH26057 - Ministry of Earth Sciences (MoES)
echo ===============================================================================
echo.
echo [1/3] Activating Python Virtual Environment...
cd /d %~dp0
call .venv\Scripts\activate.bat

echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "AquaSentinel Backend" cmd /k "title AquaSentinel Backend && .venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Starting Vite Frontend on http://127.0.0.1:5173 ...
start "AquaSentinel Frontend" cmd /k "title AquaSentinel Frontend && cd frontend && npm run dev"

echo.
echo ===============================================================================
echo AquaSentinel is running!
echo.
echo Frontend Interface:   http://localhost:5173
echo Backend API & Docs:   http://localhost:8000/docs
echo Demo Credentials:     demo@aquasentinel.ocean  /  AquaSentinel2026!
echo (Or click "Try Demo" on the login screen for instant evaluator bypass)
echo ===============================================================================
echo.
pause
