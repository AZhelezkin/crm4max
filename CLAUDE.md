# CRM4Max — Project Context

## Описание
CRM-система для самозанятых мастеров красоты (салоны, парикмахерские, барбершопы) в мессенджере Max.
Целевая аудитория: ИП и самозанятые в России.

## Демо и ссылки

### GitHub Pages (превью фронтенда)

| Приложение | URL |
|---|---|
| Индекс | https://azhelezkin.github.io/crm4max/ |
| client-app | https://azhelezkin.github.io/crm4max/client-app/ |
| master-app | https://azhelezkin.github.io/crm4max/master-app/ |

Деплой запускается автоматически при пуше в `master` (workflow `.github/workflows/pages.yml`).

### Бот в Max

Вебхук: `POST /api/bot/webhook` — обрабатывает событие `bot_started`.
Max Bot API: сообщения отправляются через `POST /messages?chat_id=<id>` (не в теле запроса).

Сценарии по `startapp` (`update.payload`):

| payload | Сценарий | Приветствие |
|---|---|---|
| *(пусто)* | Клиент → QR сканер | кнопка `startapp=qr` |
| `qr` | Клиент → QR сканер | кнопка `startapp=qr` |
| UUID | Клиент → запись к мастеру | кнопка `startapp={masterId}` |
| `mmode` | Мастер → кабинет / онбординг | кнопка `startapp=mmode` |

Ссылки для входа:
- **Клиент к Анне Смирновой:** https://max.ru/id9706002253_bot?startapp=ee5e98b7-0a08-4a01-bc38-4e3efaf165d7
- **Клиент к Дмитрию Козлову:** https://max.ru/id9706002253_bot?startapp=f185d8cb-64d1-4dd1-be90-8e056c220889
- **Мастер:** https://max.ru/id9706002253_bot?startapp=mmode
- **Нативная кнопка в мессенджере:** https://azhelezkin.github.io/crm4max/ → QR сканер

## Структура монорепозитория

```
crm4max/
├── backend/        — REST API (Fastify + Prisma + PostgreSQL)
├── master-app/     — мини-приложение мастера (React + Vite) + встроенный ClientApp
├── client-app/     — мини-приложение клиента (React + Vite)
├── infra/          — docker-compose.prod.yml, deploy.sh, nginx
├── docker-compose.yml — локальная разработка (PostgreSQL + Redis + MinIO)
├── ARCHITECTURE.md — архитектура и модели данных
├── PRD.md          — требования к продукту
└── CLAUDE.md       — этот файл
```

## Стек

| Часть | Технологии |
|---|---|
| backend | Node.js, Fastify, TypeScript, Prisma, PostgreSQL, Redis |
| master-app | React 18, TypeScript, Vite, Zustand, React Router v6 |
| client-app | React 18, TypeScript, Vite, Zustand, React Router v6 |
| Авторизация | Max Silent Auth → JWT (`@fastify/jwt`) |
| Оплата | VK Pay (webhook → `POST /api/payments/vk-webhook`) |
| Уведомления | Max Bot API (axios → `botapi.max.ru`) |
| Тесты | Vitest + React Testing Library |

## Backend — ключевые модули

| Модуль | Путь | Назначение |
|---|---|---|
| auth | `src/modules/auth/` | Max Silent Auth → JWT |
| masters | `src/modules/masters/` | профиль, карта оплаты |
| services | `src/modules/services/` | категории + услуги |
| schedule | `src/modules/schedule/` | график + генерация слотов |
| bookings | `src/modules/bookings/` | записи (CRUD + статусы) |
| payments | `src/modules/payments/` | история + VK Pay webhook |
| notifications | `src/modules/notifications/` | Max Bot + cron напоминания |
| reviews | `src/modules/reviews/` | отзывы + пересчёт рейтинга |
| bot | `src/modules/bot/` | Max Bot интеграция |
| upload | `src/modules/upload/` | загрузка файлов в S3 |

### Prisma-схема: `backend/prisma/schema.prisma`
Модели: `CreatorMaster`, `Master`, `MasterPhoto`, `Schedule`, `Category`, `Service`, `ServicePhoto`, `Client`, `Booking`, `Payment`, `Review`

**Разделение мастер-данных:**
- `creator_masters` — удостоверение личности в Max (`max_user_id` PK, `first_name`, `last_name`, `username`, `language_code`, `avatar`). Обновляется при каждой авторизации мастера.
- `masters` — бизнес-профиль (`name`, `photo`, `phone`, `description`, `contacts`, `location`, `lat`, `lng`). Заполняется мастером в онбординге/AboutMe, при входе не перезаписывается.

### Статусы записи
`PENDING → CONFIRMED → COMPLETED`
`PENDING / CONFIRMED → CANCELLED`

### Статусы оплаты
`UNPAID → DEPOSIT_PAID → PAID`

## master-app — режимы работы и страницы

`master-app/src/App.tsx` работает в двух режимах на основе `window.WebApp.initDataUnsafe.start_param`:
- `startapp=mmode` → рендерится **MasterApp**
- Всё остальное (пусто, `qr`, UUID) → рендерится **ClientApp** (встроен в `src/client/`)

Тема переключается через `document.documentElement.dataset.theme`: `'client'` или `'master'`.

Использует `HashRouter`. Нижняя навигация (MainLayout): `/`, `/bookings`, `/clients`, `/income`.

| Страница | Путь | Назначение |
|---|---|---|
| OnboardingPage | `/onboarding` | первичная настройка (если `!isOnboarded`) |
| ProfilePage | `/` | главный экран, меню |
| BookingsPage | `/bookings` | список/календарь записей |
| ChatsPage | `/clients` | клиенты + CRM-бот |
| PaymentsPage | `/income` | история платежей |
| AboutMePage | `/about` | имя, фото, контакты, описание |
| SchedulePage | `/schedule` | рабочие дни, часы, буфер |
| ServicesPage | `/services` | категории + услуги + BottomSheet |
| BookingDetailPage | `/bookings/:id` | детали + перенос + отмена |
| CreateBookingPage | `/bookings/new` | создание вручную |
| PaymentSettingsPage | `/payment-settings` | карта + VK Pay |

**Store:** `useAuthStore` — Max Silent Auth → JWT → профиль мастера (`isOnboarded` flag)

### Встроенный ClientApp (`master-app/src/client/`)

Дублирует логику `client-app` внутри master-app (для деплоя на GitHub Pages как единый артефакт). Маршруты и store идентичны client-app.

## client-app — страницы (wizard записи)

Использует `HashRouter`. Точка входа зависит от `startapp`:
- пусто или `qr` → `/qr` (QR-сканер, вызывает `window.WebApp.openCodeReader(true)`)
- UUID → `/` (карточка мастера, `?masterId=<UUID>`)

| Страница | Путь | Назначение |
|---|---|---|
| QRScanPage | `/qr` | нативный сканер QR-кода, результат → `/?masterId=<UUID>` |
| MasterCardPage | `/` | карточка мастера (услуги/фото/отзывы), `?masterId=xxx` |
| ServiceSelectPage | `/book/services` | выбор услуги |
| CalendarPage | `/book/calendar` | выбор дня → свободные слоты |
| ConfirmPage | `/book/confirm` | подтверждение деталей |
| DepositPage | `/book/deposit` | оплата депозита VK Pay |
| SuccessPage | `/book/success` | успех + добавить в календарь |
| MyBookingsPage | `/my-bookings` | мои записи (Будет / Прошло) |
| BookingDetailPage | `/my-bookings/:id` | детали + перенос + отмена |
| MessagesPage | `/messages` | сообщения |
| ContactsPage | `/contacts` | контакты |

**Store:** `useBookingStore` — wizard-состояние (masterId, service, date, time)

**BottomNav:** 1 вкладка — «Мои записи» с бейджем (количество предстоящих записей).

## Запуск

```bash
# Backend
cd backend && cp .env.example .env  # заполнить переменные
npm install && npm run db:migrate && npm run dev

# master-app
cd master-app && cp .env.example .env
npm install && npm run dev

# client-app
cd client-app && cp .env.example .env
npm install && npm run dev
```

## Тесты

```bash
cd backend    && npm test   # schedule, bookings, reviews
cd master-app && npm test   # Button, Card, Input
cd client-app && npm test   # booking.store
```

## ENV переменные

### backend/.env
```
DATABASE_URL, REDIS_URL, JWT_SECRET
VK_APP_ID, VK_APP_SECRET, VK_SERVICE_TOKEN
MAX_BOT_TOKEN, MAX_BOT_API_URL
CRON_SECRET
S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY
```

### master-app/.env / client-app/.env
```
VITE_API_URL
```

## Важные детали

- Цены хранятся в **копейках** (int), отображаются делением на 100
- Время хранится строкой `"HH:mm"`, дата — `"YYYY-MM-DD"`
- Рабочие дни: `1=Пн ... 7=Вс` (ISO, не JS-формат где 0=Вс)
- JWT payload: `{ userId, maxUserId, role: 'master' | 'client' }`
- Master и Client используют **`maxUserId`** (поле Max мессенджера; у Client переименовано из `vkUserId` в миграции `20260405100000`)
- Max Bridge поля мастера хранятся в отдельной таблице `creator_masters`, не в `masters`
- `isOnboarded` у Master — флаг завершения онбординга
- `phone` у Master — телефон для связи с клиентами (заполняется в онбординге/AboutMe); в MasterCardPage открывает `tel:` через `WebApp.openLink()`
- Напоминания клиентам отправляются за 24 часа через cron (`POST /api/notifications/reminders` с заголовком `x-cron-secret`)
- client-app открывается с query-параметром `?masterId=xxx` — точка входа для клиента
- `window.WebApp.openCodeReader(fileSelect: boolean): Promise<string>` — нативный QR-сканер Max Bridge; `fileSelect=true` добавляет выбор из галереи
- `remind: boolean` в `useBookingStore` — переключатель "Напомнить за 1 час" на CalendarPage
- Скидки: `discountPercent` (0–100%), отображаются как `% скидки` красным бейджем
- `workPhotos: ServicePhoto[]` на Service — фото работ, хранятся в S3 папке `work/`

## Продакшн (Yandex Cloud)

| Ресурс | Значение |
|---|---|
| VM IP | `158.160.244.151` |
| API URL (HTTPS) | `https://158-160-244-151.sslip.io` (sslip.io SSL) |
| SSH ключ | `~/.ssh/crm4max_deploy` (user: ubuntu) |
| Container Registry | `cr.yandex/crp6mv57ms1a67he7ukv` |
| PostgreSQL | `rc1d-mccl9656o7v0rrab.mdb.yandexcloud.net:6432` (Yandex Managed) |
| Redis | Yandex Managed Redis (REDISS, порт 6380) |
| S3 бакет | `crm4max-media` (публичное чтение, регион `ru-central1`) |
| S3 endpoint | `https://storage.yandexcloud.net` |
| S3 SA | `crm4max-storage`, key_id `YCAJEgMRV2j_ULfHUvI00xbip` |
| Docker Compose | `/opt/crm4max/docker-compose.yml` на VM |

### Деплой
```bash
SSH_KEY=~/.ssh/crm4max_deploy VM_HOST=158.160.244.151 \
YC_REGISTRY_ID=crp6mv57ms1a67he7ukv bash infra/deploy.sh
```

CI/CD: `deploy.yml` запускается при пуше в `main` если затронуты `backend/**` или `infra/**`. Шаги: тесты → Docker build → push в Yandex Registry → SSH deploy → health check.

### Seed-данные (уже залиты в прод)
- Мастера: **Анна Смирнова** (`maxUserId=100001`, `id=ee5e98b7-0a08-4a01-bc38-4e3efaf165d7`), **Дмитрий Козлов** (`maxUserId=100002`, `id=f185d8cb-64d1-4dd1-be90-8e056c220889`)
- Клиенты: Мария Иванова, Алексей Петров, Екатерина Соколова (`maxUserId=200001–200003`)
- 8 услуг, 7 записей (разные статусы), 3 отзыва, 3 платежа
- Локальный скрипт: `cd backend && npm run db:seed`

## Prisma-миграции

| Имя | Что делает |
|---|---|
| `20260325000000_init` | Все базовые таблицы |
| `20260325120000_api_v2` | +lat/lng у masters, +discountPercent/durationMax у services, +MasterPhoto |
| `20260326000000_service_photos` | +ServicePhoto (фото работ) |
| `20260331000000_uuid_ids` | id generation: cuid() → gen_random_uuid() |
| `20260401000000_master_max_fields` | +firstName, +lastName, +username, +languageCode у Master |
| `20260401010000_master_rename_vkuserid` | RENAME vk_user_id → max_user_id |
| `20260401020000_master_is_onboarded` | +is_onboarded DEFAULT false у Master |
| `20260405000000_service_duration` | RENAME duration_min → duration, DROP duration_max у Service |
| `20260405100000_client_rename_vkuserid` | RENAME vk_user_id → max_user_id у Client |
| `20260405200000_add_phone_to_masters` | +phone у Master |
| `20260405210000_creator_masters` | CREATE creator_masters, перенос Max-полей из masters, DROP firstName/lastName/username/languageCode у Master |

## Локальная разработка — MinIO

```bash
docker-compose up -d   # PostgreSQL + Redis + MinIO
# Бакет crm4max-media создаётся автоматически, публичный
# S3 API: http://localhost:9000
# Web-консоль: http://localhost:9001 (crm4max / crm4max123)
```
