@echo off
chcp 65001 >nul
title AI Career Coach - Launcher

echo ========================================================
echo    KHOI DONG HE THONG AI CAREER COACH (DOCKER)
echo ========================================================

REM 1. Tu dong tao file .env tu .env.example neu chua co
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Dang tao file .env tu .env.example...
        copy /Y ".env.example" ".env" >nul
    )
)

REM 2. Cho phep Ollama tren Windows nhan ket noi tu Docker Container
setx OLLAMA_HOST "0.0.0.0:11434" >nul 2>&1

REM 3. Kiem tra Docker Desktop da chay chua
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop chua duoc bat! Vui long mo Docker Desktop truoc khi chay.
    pause
    exit /b 1
)

REM 4. Giai phong cong 5050 va 8000 neu dang bi tien trinh cu chiem dung
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5050 ^| findstr LISTENING') do (
    echo [INFO] Giai phong tien trinh PID %%a dang chiem cong 5050...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo [INFO] Giai phong tien trinh PID %%a dang chiem cong 8000...
    taskkill /F /PID %%a >nul 2>&1
)

REM 5. Khoi chay Docker Compose (PostgreSQL + Ollama AI + Backend + Frontend)
echo [INFO] Dang build va khoi chay cac container (PostgreSQL, Ollama AI, Backend, Frontend)...
docker compose up --build -d

if %errorlevel% neq 0 (
    echo [ERROR] Khoi chay Docker Compose that bai!
    pause
    exit /b 1
)

echo.
echo ========================================================
echo    HE THONG DA KHOI CHAY THANH CONG!
echo    - Giao dien Frontend : http://localhost:5050
echo    - Backend Swagger API: http://localhost:8000/docs
echo    - PostgreSQL Database: localhost:5433
echo ========================================================
echo.

REM 6. Tu dong mo trinh duyet
timeout /t 3 >nul
start http://localhost:5050

pause
