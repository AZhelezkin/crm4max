#!/bin/bash

# 🖼️  CRM4Max - Загрузка изображений услуг
# Использование: bash upload.sh [JWT_TOKEN]

set -e

API_URL="${API_URL:-http://localhost:3000/api}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║    CRM4Max - Загрузка изображений услуг                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 API URL: $API_URL"
echo ""

# Проверка backend
echo "🔍 Проверка доступности backend..."
if ! curl -s "$API_URL/../health" > /dev/null 2>&1; then
    echo "⚠️  Backend может быть недоступен на $API_URL"
    echo ""
    echo "💡 Для запуска backend:"
    echo "   cd backend"
    echo "   npm run dev"
    echo ""
fi

JWT_TOKEN="${1}"

if [ -z "$JWT_TOKEN" ]; then
    echo "⏳ Получение JWT токена..."
    echo ""
    
    cd "$SCRIPT_DIR"
    JWT_TOKEN=$(tsx get-jwt-token.ts 2>/dev/null | grep "^eyJ" | head -1 || true)
    
    if [ -z "$JWT_TOKEN" ]; then
        echo "❌ Не удалось получить JWT токен"
        echo ""
        echo "💡 Попробуйте вручную:"
        echo "   bash upload.sh \"ВАШ_JWT_ТОКЕН\""
        echo ""
        exit 1
    fi
    
    echo "✅ Токен получен!"
    echo ""
fi

echo "🖼️  Загрузка изображений..."
echo ""

cd "$SCRIPT_DIR"
tsx upload-service-images.ts "$JWT_TOKEN"

echo ""
echo "✅ Загрузка завершена!"
echo "📄 Результаты сохранены в папке results/"
echo ""
