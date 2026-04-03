@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║    CRM4Max - Генерация seed картинок для услуг             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"
tsx generate-seed-images.ts

if !ERRORLEVEL! equ 0 (
    echo.
    echo 📂 Картинки готовы к просмотру!
    echo.
    echo 🚀 Для загрузки в S3 используйте:
    echo    .\seed-photos.bat
    echo.
) else (
    echo.
    echo ❌ Ошибка при генерации
    echo.
    pause
    exit /b !ERRORLEVEL!
)
