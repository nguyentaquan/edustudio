@echo off
title EduStudio v3.10 Sư Phạm - Hệ Thống Đa Phương Tiện Toàn Trường
echo =========================================================================
echo               EDUSTUDIO v3.10 SƯ PHẠM - HỆ THỐNG ĐIỀU HÀNH
echo =========================================================================
echo.

cd /d "%~dp0"
start "" http://127.0.0.1:8050/#tkb

netstat -ano | findstr :8050 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [EduStudio] May chu dang hoat dong tot tren cong 8050 va 8000.
    echo Da mo trinh duyet thanh cong!
    timeout /t 2 >nul
    exit /b
)

echo Dang khoi dong may chu song song tren ca Port 8000 va Port 8050...
python server.py
pause
