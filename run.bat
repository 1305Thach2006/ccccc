@echo off
chcp 65001 >nul
title AI Career Coach - Launcher
cd /d "%~dp0"

echo ========================================================
echo    KHOI DONG HE THONG AI CAREER COACH (DOCKER)
echo ========================================================

REM 1. Kiem tra Docker Desktop da chay chua
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop chua duoc bat hoac chua san sang.
    echo         Vui long mo Docker Desktop, cho bieu tuong chuyen sang "Engine running" roi chay lai.
    pause
    exit /b 1
)

REM 2. Dung cac container cu cua du an (neu co) de giai phong cong 5050 / 8000 / 5433
REM    Lenh nay KHONG xoa du lieu Database va model AI da tai.
echo [INFO] Dung cac container cu cua du an (neu co)...
docker compose down --remove-orphans >nul 2>&1

REM 3. Canh bao neu cong van dang bi chuong trinh khac chiem dung
for %%p in (5050 8000 5433) do (
    netstat -ano | findstr /R /C:":%%p .*LISTENING" >nul 2>&1 && (
        echo [WARNING] Cong %%p dang bi mot chuong trinh khac su dung. Hay tat chuong trinh do hoac doi cong trong file .env
    )
)

REM 4. Build va khoi chay 4 container (PostgreSQL + Ollama AI + Backend + Frontend)
echo [INFO] Dang build va khoi chay cac container...
docker compose up --build -d
if %errorlevel% neq 0 (
    echo [ERROR] Khoi chay Docker Compose that bai! Xem huong dan xu ly loi trong README.md
    pause
    exit /b 1
)

echo.
echo ========================================================
echo    HE THONG DA KHOI CHAY THANH CONG!
echo    - Giao dien Web      : http://localhost:5050
echo    - Backend Swagger API: http://localhost:8000/docs
echo    - PostgreSQL         : localhost:5433
echo.
echo    Lan chay dau tien, Docker se tai model AI qwen3.5:4b (khoang 3.3 GB).
echo    Xem tien do tai model bang lenh: docker logs -f career_coach_ollama
echo ========================================================
echo.

REM 5. Tu dong mo trinh duyet
timeout /t 3 >nul
start http://localhost:5050

pause
