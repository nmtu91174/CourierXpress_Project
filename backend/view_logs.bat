@echo off
chcp 65001 >nul
echo ========================================
echo   VIEW BACKEND LOGS - CourierXpress
echo ========================================
echo.
echo 1. App Log (50 dòng cuối)
echo 2. Audit Log (50 dòng cuối)
echo 3. PHP Error Log (50 dòng cuối)
echo 4. Xem tất cả logs
echo 5. Xem real-time App Log
echo.
set /p choice="Chọn (1-5): "

if "%choice%"=="1" (
    echo.
    echo ========== APP LOG (50 dòng cuối) ==========
    echo.
    powershell -Command "Get-Content backend\logs\app.log -Tail 50"
) else if "%choice%"=="2" (
    echo.
    echo ========== AUDIT LOG (50 dòng cuối) ==========
    echo.
    powershell -Command "Get-Content backend\logs\audit.log -Tail 50"
) else if "%choice%"=="3" (
    echo.
    echo ========== PHP ERROR LOG (50 dòng cuối) ==========
    echo.
    echo Đang tìm PHP error log...
    for %%f in (C:\xampp\php\logs\php_error_log C:\wamp\logs\php_error.log C:\php\logs\php_error_log) do (
        if exist "%%f" (
            powershell -Command "Get-Content '%%f' -Tail 50"
            goto :found
        )
    )
    echo Không tìm thấy PHP error log. Kiểm tra php.ini để biết vị trí.
    :found
) else if "%choice%"=="4" (
    echo.
    echo ========== APP LOG ==========
    echo.
    powershell -Command "Get-Content backend\logs\app.log -Tail 30"
    echo.
    echo ========== AUDIT LOG ==========
    echo.
    powershell -Command "Get-Content backend\logs\audit.log -Tail 30"
) else if "%choice%"=="5" (
    echo.
    echo ========== APP LOG (REAL-TIME) ==========
    echo Nhấn Ctrl+C để dừng
    echo.
    powershell -Command "Get-Content backend\logs\app.log -Wait -Tail 20"
) else (
    echo Lựa chọn không hợp lệ
)

echo.
pause





