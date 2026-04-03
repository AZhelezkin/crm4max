@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║    CRM4Max - Загрузка фото работ в S3                      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Проверяем, что мы в директории scripts
if not exist "..\backend" (
    echo ❌ Ошибка: запустите скрипт из папки scripts
    echo.
    echo Команда: cd scripts ^&^& upload-s3.bat
    echo.
    pause
    exit /b 1
)

REM Загружаем переменные окружения из backend/.env (пропускаем комментарии и пустые строки)
for /f "usebackq eol=# tokens=*" %%a in (..\backend\.env) do set "%%a"

REM Проверяем обязательные переменные
if "%S3_BUCKET%"=="" (
    echo ❌ Ошибка: S3_BUCKET не установлен в backend/.env
    echo.
    echo Проверьте, что в backend\.env заполнены переменные:
    echo   - S3_BUCKET
    echo   - S3_REGION
    echo   - S3_ENDPOINT
    echo   - S3_ACCESS_KEY
    echo   - S3_SECRET_KEY
    echo   - DATABASE_URL
    echo.
    pause
    exit /b 1
)

echo 📋 Конфиг S3:
echo   Bucket: %S3_BUCKET%
echo   Endpoint: %S3_ENDPOINT%
echo   Region: %S3_REGION%
echo.

echo 🚀 Запуск загрузки...
echo.

cd /d "%~dp0"
set "NODE_ENV=production"
tsx upload-s3-photos.ts

if !ERRORLEVEL! equ 0 (
    echo.
    echo ✅ Загрузка завершена успешно!
    echo.
    echo 📝 Результаты сохранены в: ..\results\s3-upload-results-*.json
    echo.
) else (
    echo.
    echo ❌ Загрузка завершена с ошибкой
    echo.
    pause
    exit /b !ERRORLEVEL!
)
