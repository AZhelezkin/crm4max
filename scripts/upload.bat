@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║    CRM4Max - Загрузка изображений услуг                    ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

set "API_URL=http://localhost:3000/api"
echo 📍 API URL: %API_URL%
echo.

if "%1"=="" (
    echo ⏳ Получение JWT токена...
    echo.
    
    cd /d "%~dp0"
    for /f "delims=" %%i in ('tsx get-jwt-token.ts 2^>nul ^| findstr /c:"eyJ"') do (
        set "JWT_TOKEN=%%i"
    )
    
    if "!JWT_TOKEN!"=="" (
        echo ❌ Не удалось получить JWT токен
        echo.
        echo 💡 Попробуйте вручную:
        echo    1. Запустите: cd ..\backend ^& npm run dev
        echo    2. Затем: tsx get-jwt-token.ts
        echo    3. Скопируйте токен и выполните: upload.bat "ВАШ_ТОКЕН"
        echo.
        pause
        exit /b 1
    )
    
    echo ✅ Токен получен!
    echo.
) else (
    set "JWT_TOKEN=%1"
)

echo 🖼️  Загрузка изображений...
echo.

cd /d "%~dp0"
tsx upload-service-images.ts "!JWT_TOKEN!"

if !ERRORLEVEL! equ 0 (
    echo.
    echo ✅ Загрузка завершена успешно!
    echo 📄 Результаты сохранены в папке results/
    echo.
) else (
    echo.
    echo ❌ Ошибка при загрузке
    echo.
)

pause
