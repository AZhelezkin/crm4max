#!/bin/bash
# Деплой бэкенда в Яндекс Облако
# Запускать локально или из CI/CD
#
# Требования:
#   - yc CLI настроен (yc init)
#   - Docker установлен
#   - Переменные окружения ниже заданы (или переданы через CI secrets)
#
# Использование: bash infra/deploy.sh

set -euo pipefail

# ── Конфигурация ──────────────────────────────────────────────────────────────
YC_REGISTRY_ID="${YC_REGISTRY_ID:?Укажи YC_REGISTRY_ID}"
VM_HOST="${VM_HOST:?Укажи VM_HOST (IP или домен VM)}"
VM_USER="${VM_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-}"
IMAGE_NAME="cr.yandex/${YC_REGISTRY_ID}/crm4max-backend"
# Тег: явный IMAGE_TAG → git hash → дата
if [ -z "${IMAGE_TAG:-}" ]; then
  IMAGE_TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
fi
DEPLOY_DIR="/opt/crm4max"
SSH_OPTS="-o StrictHostKeyChecking=no${SSH_KEY:+ -i ${SSH_KEY}}"

echo "==> Сборка Docker-образа (tag: ${IMAGE_TAG})"
docker build \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  -t "${IMAGE_NAME}:latest" \
  ./backend

echo "==> Авторизация в Yandex Container Registry"
yc iam create-token | docker login \
  --username iam \
  --password-stdin \
  cr.yandex

echo "==> Пуш образа в реестр"
docker push "${IMAGE_NAME}:${IMAGE_TAG}"
docker push "${IMAGE_NAME}:latest"

echo "==> Деплой на VM (${VM_HOST})"
ssh ${SSH_OPTS} "${VM_USER}@${VM_HOST}" bash <<EOF
  set -e

  # Авторизация Docker на VM
  yc iam create-token | docker login \
    --username iam \
    --password-stdin \
    cr.yandex

  echo "Тянем новый образ..."
  docker pull ${IMAGE_NAME}:${IMAGE_TAG}

  echo "Перезапускаем контейнер..."
  cd ${DEPLOY_DIR}
  IMAGE_TAG=${IMAGE_TAG} YC_REGISTRY_ID=${YC_REGISTRY_ID} \
    docker compose -f docker-compose.yml up -d --no-deps backend

  echo "Чистим старые образы..."
  docker image prune -f

  echo "Проверяем health..."
  sleep 5
  curl -sf http://localhost:3000/health && echo "✅ Backend запущен" || echo "❌ Health check провалился"
EOF

echo ""
echo "✅ Деплой завершён! Tag: ${IMAGE_TAG}"
