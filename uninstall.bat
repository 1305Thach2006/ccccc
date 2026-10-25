@echo off
chcp 65001 >nul
title AI Career Coach - Uninstall
cd /d "%~dp0"

echo ========================================================
echo    GO CAI DAT SACH AI CAREER COACH KHOI DOCKER
echo ========================================================
echo  Thao tac nay se XOA VINH VIEN:
echo   - 4 container cua du an
echo   - Du lieu Database (tai khoan, lo trinh, streak...)
echo   - Model AI qwen3.5:4b da tai trong Docker
echo   - Cac image da build cua du an
echo   - Build cache cua Docker
echo ========================================================
set /p CONFIRM=Nhap Y de xac nhan xoa sach (Y/N): 
if /I not "%CONFIRM%"=="Y" (
    echo [INFO] Da huy thao tac.
    pause
    exit /b 0
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop chua duoc bat. Vui long mo Docker Desktop roi chay lai.
    pause
    exit /b 1
)

docker compose down -v --rmi all --remove-orphans
docker builder prune -a -f

echo.
echo [INFO] Da go cai dat sach khoi Docker.
echo [INFO] Neu muon xoa luon thu muc ma nguon, hay dong cua so nay roi xoa thu muc du an.
echo [INFO] Mo lai web sau khi cai moi: phien dang nhap cu trong trinh duyet se tu dong duoc don sach.
pause
