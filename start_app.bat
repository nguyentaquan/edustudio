@echo off
title EduStudio v2.3 Su Pham - He Thong Da Phuong Tien Mo
echo =========================================================================
echo               EDUSTUDIO v2.3 SƯ PHẠM - HE THONG TAC GIA
echo =========================================================================
echo.
echo Dang khoi dong may chu song song tren ca Port 8000 va Port 8050...
echo.

cd /d "%~dp0"
start "" http://localhost:8050
python server.py

pause
