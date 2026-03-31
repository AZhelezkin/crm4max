#!/bin/bash
# Первоначальная настройка VM в Яндекс Облако
# Запускать один раз на свежей Ubuntu 22.04
# Использование: bash setup-vm.sh

set -e

echo "==> Обновляем систему"
apt-get update && apt-get upgrade -y

echo "==> Устанавливаем Docker"
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Добавляем текущего пользователя в группу docker"
usermod -aG docker $USER

echo "==> Устанавливаем nginx"
apt-get install -y nginx

echo "==> Устанавливаем certbot (Let's Encrypt)"
apt-get install -y certbot python3-certbot-nginx

echo "==> Устанавливаем Yandex Cloud CLI"
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash

echo "==> Создаём директорию приложения"
mkdir -p /opt/crm4max
chown $USER:$USER /opt/crm4max

echo ""
echo "✅ VM готова!"
echo ""
echo "Следующие шаги:"
echo "1. Скопируй infra/nginx/nginx.conf → /etc/nginx/sites-available/crm4max"
echo "   и замени YOUR_DOMAIN на реальный домен"
echo "2. ln -s /etc/nginx/sites-available/crm4max /etc/nginx/sites-enabled/"
echo "3. certbot --nginx -d YOUR_DOMAIN"
echo "4. Скопируй infra/.env.prod.example → /opt/crm4max/.env.prod и заполни"
echo "5. Скопируй infra/docker-compose.prod.yml → /opt/crm4max/docker-compose.yml"
echo "6. Авторизуй Docker в Yandex Container Registry:"
echo "   yc iam create-token | docker login --username iam --password-stdin cr.yandex"
