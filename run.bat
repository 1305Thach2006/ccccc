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

REM 2. Kiem tra Docker Desktop da chay chua
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop chua duoc bat! Vui long mo Docker Desktop truoc khi chay.
    pause
    exit /b 1
)

REM 3. Giai phong cong 5050 neu dang bi tien trinh Node cu chiem dung
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5050 ^| findstr LISTENING') do (
    echo [INFO] Phat hien tien trinh PID %%a dang chiem cong 5050, tien hanh giai phong...
    taskkill /F /PID %%a >nul 2>&1
)

REM 4. Khoi chay Docker Compose
echo [INFO] Dang build va khoi chay cac container (PostgreSQL, Backend, Frontend)...
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

REM 5. Tu dong mo trinh duyet
timeout /t 3 >nul
start http://localhost:5050

pause
