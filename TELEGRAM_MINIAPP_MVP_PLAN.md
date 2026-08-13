# План MVP: запуск кабинета CRM в Telegram Mini App

## Цель

Проверить минимальным вертикальным срезом, что существующий кабинет мастера работает как Telegram Mini App и при этом текущий MAX Mini App не ломается.

MVP считается успешным, когда уже известный системе мастер:

1. открывает Mini App из существующего Telegram-бота;
2. проходит серверную проверку `Telegram.WebApp.initData`;
3. получает обычный JWT CRM;
4. видит главную, расписание, клиентов, услуги и записи;
5. выполняет одну реальную CRM-операцию, например создаёт или меняет запись;
6. после этого тот же сценарий продолжает работать в MAX без изменений для пользователя.

## Принцип MVP

Не строим заранее универсальную платформу мессенджеров.

Делаем только две узкие границы:

- frontend получает launch/auth данные через маленький host adapter;
- backend проверяет Telegram init data отдельным auth adapter и после этого использует существующие CRM API.

MAX- и Telegram-боты остаются отдельными. Их webhook, команды, диалоги и отправка сообщений в MVP не объединяются.

## Ограничение первого запуска

Первый MVP запускаем только для кабинета мастера и только для пилотных Telegram-пользователей, уже сопоставленных с существующим `Master.id`.

Для сопоставления используем текущую конфигурацию Telegram-профилей или небольшой allowlist вида:

```text
telegram user id -> существующий Master.id
```

В MVP не создаём `Account`, `MessengerIdentity`, `BotInstallation`, автоматическое связывание аккаунтов и миграцию всех MAX-пользователей. Сначала доказываем, что Mini App, auth и CRM-сценарии работают end-to-end.

## Рабочие деревья

Работа ведётся только в созданных соседних worktree:

- frontend: `/home/clyde/Projects/max-crm/max-miniapp-platform-abstraction`;
- backend: `/home/clyde/Projects/max-crm/max-bot-platform-abstraction`.

Исходные `max-miniapp` и `max-bot` не изменяем.

## Порядок работ

### 1. Зафиксировать работающий MAX baseline

Frontend:

- запустить текущие unit/integration тесты `master-app`;
- зафиксировать smoke запуска `mmode` в MAX harness;
- не рефакторить все существующие вызовы `window.WebApp`.

Backend:

- запустить текущие тесты `src/modules/auth/auth.service.test.ts`;
- зафиксировать ответ `POST /api/auth/max` и JWT claims как compatibility contract.

Результат этапа: есть зелёная точка сравнения до Telegram-изменений.

### 2. Добавить минимальный frontend host adapter

Создать:

```text
master-app/src/platform/host.ts
master-app/src/platform/max-host.ts
master-app/src/platform/telegram-host.ts
```

Контракт содержит только то, что нужно для первого запуска:

```ts
type HostKind = 'max' | 'telegram'

interface MiniAppHost {
  kind: HostKind
  initData: string
  startParam: string
  ready(): void
  close(): void
  openExternal(url: string): void
}
```

На этом этапе через adapter переводятся только:

- чтение `initData`;
- чтение `start_param`;
- `ready()`;
- `close()`;
- открытие внешней ссылки, если оно встречается в MVP-маршруте.

Остальные прямые MAX bridge-вызовы не переносим, пока они не блокируют пилот.

Результат этапа: startup/auth код больше не обязан знать, где лежит `window.WebApp` или `window.Telegram.WebApp`.

### 3. Добавить отдельный Telegram entrypoint

Добавить отдельный HTML/TS entrypoint, например:

```text
master-app/telegram.html
master-app/src/telegram-main.tsx
```

Требования:

- MAX entrypoint загружает только MAX SDK;
- Telegram entrypoint загружает только официальный `telegram-web-app.js`;
- оба entrypoint рендерят тот же React `App`;
- Telegram transport fragment очищается до того, как `HashRouter` примет его за маршрут;
- Telegram entrypoint вызывает `ready()` сразу после первого пригодного render;
- тема пока остаётся текущей системной, без отдельной синхронизации с Telegram theme API.

Vite настраивается как multi-page build. Telegram-бот получает URL Telegram entrypoint, а текущий MAX URL не меняется.

Результат этапа: один frontend bundle запускается в двух WebView без подмены глобальных объектов.

### 4. Добавить `POST /api/auth/telegram`

В production backend, а не внутри локального `telegram-rasa-mvp`, добавить:

```http
POST /api/auth/telegram
{
  "init_data": "<raw Telegram.WebApp.initData>",
  "timezone": "Europe/Moscow"
}
```

Endpoint делает только следующее:

1. проверяет подпись raw init data токеном существующего Telegram-бота;
2. проверяет `auth_date` с TTL 1 час и допустимым clock skew;
3. берёт Telegram user id только из проверенных данных;
4. ищет этот id в пилотном mapping;
5. получает существующий `Master.id`;
6. выдаёт JWT с текущими рабочими claims и дополнительным `provider: 'telegram'`:

```ts
{
  userId: masterId,
  role: 'master',
  provider: 'telegram'
}
```

`maxUserId` для Telegram не подделываем. Места MVP-маршрута, которые требуют `maxUserId`, либо переводим на `userId`, либо не включаем в MVP.

Не переносим в production статическую или синтетическую identity-модель из `telegram-rasa-mvp`. Используем только явный pilot mapping.

Результат этапа: Telegram пользователь получает JWT существующего мастера без изменения бизнес-моделей Prisma.

### 5. Подключить frontend auth к провайдеру

Изменить auth API так, чтобы endpoint выбирался по `host.kind`:

```text
max      -> /api/auth/max
telegram -> /api/auth/telegram
```

Для Telegram MVP допускается только `start_param=mmode`. Неизвестный или пустой Telegram launch завершается понятной ошибкой, а не пытается угадать роль.

Токен хранить отдельно от MAX:

```text
crm4max:token:max:master
crm4max:token:telegram:master
```

На время перехода MAX продолжает читать старый `masterToken`, чтобы не разлогинить текущих пользователей.

Не переделывать сразу оба Zustand auth store и весь startup. Достаточно убрать двойную авторизацию на Telegram-пути и сохранить текущее поведение MAX.

Результат этапа: Telegram и MAX на одном origin не подбирают JWT друг друга.

### 6. Открыть Mini App из существующего Telegram-бота

В Telegram adapter бота добавить одну кнопку или команду «Открыть кабинет».

Она открывает Telegram Mini App с `startapp=mmode`. Можно использовать настроенный Main Mini App или прямую ссылку существующего бота. Выбираем тот вариант, который уже поддерживается текущим ботом и требует меньше изменений.

Не меняем MAX webhook и не проксируем Telegram updates через MAX transport.

Результат этапа: пилотный пользователь входит в кабинет одним нажатием из Telegram.

### 7. Ограничить MVP рабочими экранами

В Telegram MVP проверяем:

- главную мастера;
- список и детали записей;
- создание или изменение одной записи;
- клиентов;
- услуги;
- расписание;
- редактирование основного профиля.

Если MAX-only действие доступно из этих экранов и ломает путь, для Telegram его временно скрываем или возвращаем явное «пока недоступно». Не реализуем аналог заранее.

В MVP не входят:

- клиентский режим и запись клиента;
- QR-сканер;
- Telegram-уведомления;
- поддержка через Telegram;
- ссылки «Написать в MAX» и общий каталог contact channels;
- шеринг ссылки мастера в Telegram;
- экспорт/нативный download, если browser fallback не работает сразу;
- привязка существующих MAX- и Telegram-профилей одного человека;
- публичный Telegram onboarding новых мастеров;
- покупка подписки в Telegram;
- оплата клиентского депозита;
- полное удаление прямых `window.WebApp` вызовов.

Для пилотного мастера заранее должна быть активна подписка или тестовый доступ. Платёжный сценарий не должен блокировать проверку Mini App.

Результат этапа: продукт не обещает в Telegram функции, которые MVP не проверяет.

### 8. Проверить вертикальный сценарий

Автоматические проверки:

- unit-тест валидной и испорченной Telegram init data;
- unit-тест просроченного `auth_date`;
- route-тест mapped и unmapped Telegram user;
- frontend-тест выбора Telegram auth endpoint;
- frontend-тест `mmode -> MasterApp` через Telegram host fixture;
- architecture-тест, запрещающий новые прямые обращения к Telegram global вне `telegram-host.ts`;
- существующие MAX auth/launch тесты остаются зелёными.

Ручной smoke в реальном Telegram:

1. открыть кабинет из бота;
2. дождаться главной без перезагрузки;
3. открыть расписание, клиентов, услуги и записи;
4. создать тестовую запись;
5. закрыть и повторно открыть Mini App;
6. убедиться, что сессия и данные сохранились;
7. повторить критический MAX smoke.

Результат этапа: есть end-to-end доказательство, а не только SDK mock.

### 9. Выпустить закрытый пилот

- задеплоить Telegram entrypoint на staging/production HTTPS origin;
- задать Telegram bot token и pilot mapping через secrets/env;
- добавить 1-3 пилотных мастеров;
- логировать только provider, результат auth и внутренний `Master.id`, без raw init data и bot token;
- собрать реальные ошибки WebView и список недоступных действий.

После пилота остановиться и разобрать фактические проблемы. Не переходить автоматически к большой миграции.

## Критерии готовности MVP

- Telegram init data проверяется только на backend.
- Unmapped Telegram пользователь не получает CRM JWT.
- Telegram JWT открывает только сопоставленного мастера.
- Основные master CRUD-сценарии работают в реальном Telegram клиенте.
- MAX запуск, auth и основные сценарии не изменили поведение.
- Telegram SDK не загружается в MAX entrypoint и наоборот.
- Нет синтетического `maxUserId` для Telegram.
- Нет новой универсальной identity/delivery платформы до результатов пилота.

## Что делать после MVP

Следующий пункт выбирается только по результатам пилота, а не весь список сразу.

1. Если нужен публичный onboarding Telegram-мастеров: добавить минимальное постоянное поле `telegramUserId` и разрешить создание Telegram-only `Master`.
2. Если нужен клиентский Mini App: добавить Telegram client auth и пройти один сценарий `ссылка мастера -> выбор услуги -> запись`.
3. Если нужны уведомления: сохранить Telegram chat/write access и добавить Telegram delivery только для одного типа уведомления.
4. Если пользователи реально работают и в MAX, и в Telegram: спроектировать явное связывание профилей; до этого профили не объединять автоматически.
5. Если нужна покупка подписки в Telegram: сделать отдельный Stars flow и подтверждать оплату серверным update.
6. Если пилот упирается в QR, share, download, BackButton, safe area или theme: переносить только конкретную capability в host adapter и добавлять тест на найденный случай.

## Первый исполнимый срез

Начать с двух небольших PR, не смешивая репозитории:

1. Backend PR: Telegram init-data verifier, `/api/auth/telegram`, pilot mapping, тесты.
2. Frontend PR: Telegram entrypoint, минимальный host adapter, provider-aware auth, реальный Telegram smoke.

После слияния и пилота составить следующий план только по наблюдаемым блокерам.
