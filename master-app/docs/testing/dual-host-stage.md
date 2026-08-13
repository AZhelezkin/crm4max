# Dual-host Mini App stage baseline

## Scope

Этот runbook публикует текущий Telegram master pilot. Он не включает Telegram client mode, notifications, support, payments или durable identity migration.

Обычный `npm run build` сохраняет оба entrypoint:

```text
dist/index.html     MAX
dist/telegram.html  Telegram
```

Telegram stage публикуется только из отдельного prepared artifact, где root `index.html` равен `telegram.html`.

## Required local configuration

Map-enabled Telegram build требует ignored `master-app/.env.local` либо environment/CI secrets:

```text
VITE_YANDEX_SUGGEST_KEY
VITE_YANDEX_GEOCODE_KEY
VITE_YANDEX_JSMAPS_KEY
```

Значения не выводятся deploy scripts и не должны коммититься. Telegram bot token статическому deploy не нужен.

## Stage routing prerequisite

Reviewed vhost contract находится в:

```text
infra/telegram-stage/Caddyfile
```

Критическое правило: `/api/*` и static SPA fallback находятся в разных `handle`, иначе Caddy может применить `try_files` раньше reverse proxy и вернуть static `405` на API mutation.

Backend и SSH reverse tunnel `127.0.0.1:18082 -> local :3000` должны быть доступны до deploy. Routing preflight ожидает backend JSON `401` от unauthenticated `PUT /api/masters/me`.

## Build and inspect

```bash
cd master-app
npm run test:baseline
npm run build:telegram-stage
```

Prepared artifacts immutable по content hash:

```text
master-app/.artifacts/telegram-stage/releases/<sha256>/
master-app/.artifacts/telegram-stage/current.json
```

`.artifacts/` игнорируется Git.

## Deploy

Из корня frontend worktree:

```bash
./infra/telegram-stage/deploy.sh
```

Либо из `master-app`:

```bash
npm run deploy:telegram-stage
```

Deploy выполняет:

1. exact host/root/URL validation;
2. remote Caddy validation;
3. API и SPA routing preflight;
4. build и deterministic artifact preparation;
5. hash verification;
6. `rsync --delete` только в dedicated stage root;
7. full root/assets/API smoke.

Shared Caddyfile deploy не переписывает.

## Rollback

Список локальных releases:

```bash
ls master-app/.artifacts/telegram-stage/releases
```

Публикация предыдущего exact artifact:

```bash
./infra/telegram-stage/deploy.sh --release <full-sha256>
```

Rollback проходит те же routing и post-deploy checks.

## Telegram menu URL

Deploy выводит versioned URL вида:

```text
https://tg.stage.soldatov.dev/?v=<short-release-id>
```

Изменение Telegram bot menu button выполняется отдельной operator-командой с bot token из secret storage. Не добавлять bot token в build/deploy environment и не записывать его в shell history или evidence.

## Automatic smoke contract

```bash
cd master-app
npm run smoke:telegram-stage -- --url https://tg.stage.soldatov.dev --release <full-sha256>
```

Success означает только:

- root отдаёт Telegram SDK/bootstrap, не MAX;
- same-origin assets доступны;
- API mutation доходит до backend auth boundary;
- SPA fallback работает.

Это не доказывает реальный Telegram auth или пользовательские сценарии.

## Required real-client smoke

После deploy вручную проверить:

1. Telegram mobile: открыть versioned URL из bot menu, войти mapped master-ом.
2. Telegram Desktop: повторить cold open и reload.
3. Открыть клиентов, записи и расписание.
4. Создать безопасную тестовую запись и проверить изменение расписания.
5. Открыть полноэкранную карту, получить autocomplete и выбрать адрес.
6. Закрыть и повторно открыть Mini App.
7. MAX master: выполнить launch/auth и одну read/write операцию.
8. MAX client: открыть share link и пройти основной booking flow.

Evidence не должно содержать raw init data, JWT, bot token, реальные телефоны или production PII.
