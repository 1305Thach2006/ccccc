@echo off
chcp 65001 >nul
title AI Career Coach - Stop Containers
cd /d "%~dp0"

echo ========================================================
echo    DANG DUNG HE THONG AI CAREER COACH...
echo ========================================================

docker compose down

echo.
echo [INFO] Da dung toan bo container (du lieu Database va model AI van duoc giu lai).
pause
