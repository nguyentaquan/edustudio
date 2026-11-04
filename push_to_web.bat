@echo off
title DANG DAY EDUSTUDIO LEN WEB (GITHUB / VERCEL)
color 0b
echo =====================================================================
echo    EDUSTUDIO - DANG DAY MA NGUON MOI NHAT LEN WEB (v3.10.35 GDMN & GDPT)
echo =====================================================================
echo.
cd /d "d:\TAQUAN\DU LIEU\EduStudio"
git status
echo.
echo Dang thuc hien: git push origin main...
echo (Neu trinh duyet bat cua so dang nhap GitHub, xin Thay vui long bam Dang Nhap)
echo.
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
    color 0a
    echo =====================================================================
    echo   [THANH CONG 100%%] DA DAY TOAN BO DU LIEU LEN WEB CHINH THUC!
    echo =====================================================================
) else (
    color 0c
    echo =====================================================================
    echo   [CHUA THANH CONG] Vui long kiem tra lai ket noi hoac xac thuc GitHub.
    echo =====================================================================
)
echo.
pause

