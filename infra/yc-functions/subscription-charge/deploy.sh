#!/usr/bin/env bash
# Деплой YC Cloud Function crm4max-subscription-charge (списание подписок по cron).
#
# Частая операция — пересобрать версию функции после правки index.js:
#   CRON_SECRET=xxxxx bash infra/yc-functions/subscription-charge/deploy.sh
#
# CRON_SECRET можно не передавать — тогда подтянем с прод-VM из /opt/crm4max/.env.prod.
#
# Одноразовый setup (уже выполнен, ID ниже — для справки/пересоздания):
#   SA:       crm4max-cron            = ajebc7afeuo1q3gfd8le  (роль serverless.functions.invoker)
#   Function: crm4max-subscription-charge = d4eu8povn1g53tai3uua
#   Trigger:  crm4max-charge-due-daily, cron "0 3 * * ? *" (03:00 UTC = 06:00 МСК)
#
#   yc iam service-account create --name crm4max-cron \
#     --description "Invokes subscription charge function from timer trigger"
#   yc resource-manager folder add-access-binding "$FOLDER_ID" \
#     --role serverless.functions.invoker --subject serviceAccount:<SA_ID>
#   yc serverless function create --name crm4max-subscription-charge
#   yc serverless trigger create timer --name crm4max-charge-due-daily \
#     --cron-expression "0 3 * * ? *" \
#     --invoke-function-name crm4max-subscription-charge \
#     --invoke-function-service-account-id <SA_ID>
set -euo pipefail
export YC_CLI_INITIALIZATION_SILENCE=true

API_URL="${API_URL:-https://81-26-186-235.sslip.io}"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

# CRON_SECRET: из окружения или с прод-VM.
if [ -z "${CRON_SECRET:-}" ]; then
  echo "==> CRON_SECRET не задан — читаю с прод-VM"
  CRON_SECRET=$(ssh -i ~/.ssh/crm4max_deploy ubuntu@81.26.186.235 \
    "grep '^CRON_SECRET=' /opt/crm4max/.env.prod | cut -d= -f2")
fi
[ -n "$CRON_SECRET" ] || { echo "CRON_SECRET пуст — прерываю"; exit 1; }

echo "==> Деплою новую версию функции crm4max-subscription-charge"
yc serverless function version create \
  --function-name crm4max-subscription-charge \
  --runtime nodejs18 \
  --entrypoint index.handler \
  --memory 128m \
  --execution-timeout 120s \
  --source-path "$SRC_DIR" \
  --environment API_URL="$API_URL" \
  --environment CRON_SECRET="$CRON_SECRET"

echo "==> Готово. Проверка:"
echo "    yc serverless function invoke --name crm4max-subscription-charge"
