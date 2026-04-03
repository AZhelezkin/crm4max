@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   CRM4Max - Seed фото услуг в Yandex Object Storage        ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Проверяем YC CLI
yc --version >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo ❌ Ошибка: Yandex Cloud CLI не установлен
    echo.
    echo Инструкция по установке: https://cloud.yandex.ru/docs/cli/quickstart
    echo.
    pause
    exit /b 1
)

REM Проверяем, что мы в директории scripts
if not exist "..\backend\.env" (
    echo ❌ Ошибка: backend\.env не найден
    echo.
    echo Команда: cd scripts ^&^& seed-photos.bat
    echo.
    pause
    exit /b 1
)

echo 🔐 Проверка конфигурации YC...
yc config list 2>&1 | findstr "cloud-id" >nul
if !ERRORLEVEL! equ 0 (
    echo ✅ YC CLI настроен
) else (
    echo ⚠️  YC CLI может быть не настроен. Продолжаем...
)

echo.
echo 🚀 Запуск генерации seed фото...
echo.

cd /d "%~dp0"
tsx seed-service-photos.ts

if !ERRORLEVEL! equ 0 (
    echo.
    echo ✅ Seed фото успешно загружены!
    echo.
    echo 📝 Результаты: ..\results\seed-photos-*.json
    echo.
) else (
    echo.
    echo ❌ Ошибка загрузки seed фото
    echo.
    pause
    exit /b !ERRORLEVEL!
)
