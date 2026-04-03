@echo off
chcp 65001 >nul

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║      Чтение каталога услуг из продакшн БД                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0backend"
npx tsx src/scripts/read-prod-catalog.ts
