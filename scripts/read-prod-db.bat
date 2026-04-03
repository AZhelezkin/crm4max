@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0backend"

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  CRM4Max - Чтение каталога из продакшн БД (Yandex Cloud)  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 📦 Проверка зависимостей...
if not exist "node_modules" (
    echo ⏳ Установка npm пакетов...
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo ❌ Ошибка установки пакетов
        pause
        exit /b 1
    )
)

echo.
echo 📡 Подключение к БД...
call npx tsx src/scripts/read-prod-catalog.ts

if !ERRORLEVEL! neq 0 (
    echo.
    echo ❌ Ошибка при чтении услуг
    pause
    exit /b 1
)

echo.
echo ✅ Готово!
echo.
pause
