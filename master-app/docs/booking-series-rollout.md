# Rollout серий записей

## Порядок включения

1. Оставить materializer trigger на паузе.
2. Применить backend migration rehearsal из `docs/runbooks/booking-series-migration.md` и задеплоить backend.
3. Проверить authenticated preview, create, read, single mutation и batch preview/PATCH на тестовой серии мастера.
4. Задеплоить `master-app`. Временного frontend feature flag больше нет: runtime всегда использует REST adapter.
5. Проверить конечную и бессрочную серии, `SINGLE`, `THIS_AND_FUTURE`, `ALL` и batch cancel с оплаченной записью в `skipped`.
6. Выполнить ручной materializer smoke, проверить отсутствие дублей при повторном вызове и только после этого включить daily trigger.
7. Проверить одно агрегированное уведомление на create/batch mutation и обычное напоминание отдельного экземпляра.

## Откат

1. Сразу приостановить materializer trigger.
2. Откатить `master-app` на предыдущий Pages artifact, чтобы скрыть входы в управление сериями.
3. Откатить backend application image, не удаляя additive schema и данные серий.
4. Не откатывать миграцию с удалением таблиц или колонок: существующие Booking остаются рабочими благодаря nullable series fields.
5. После исправления повторить migration rehearsal, authenticated smoke и только затем снова включать frontend и trigger.

Cloud Function, Lockbox secret и команды pause/resume описаны в backend runbook `docs/runbooks/booking-series-materializer.md`.
