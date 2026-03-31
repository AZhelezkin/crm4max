# CRM4Max — Project Context

## Описание
CRM-система для самозанятых мастеров красоты (салоны, парикмахерские, барбершопы) в мессенджере Max.
Целевая аудитория: ИП и самозанятые в России.

## Структура монорепозитория

```
crm4max/
├── backend/        — REST API (Fastify + Prisma + PostgreSQL)
├── master-app/     — мини-приложение мастера (React + Vite)
├── client-app/     — мини-приложение клиента (React + Vite)
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
| Авторизация | VK Silent Auth → JWT (`@fastify/jwt`) |
| Оплата | VK Pay (webhook → `POST /api/payments/vk-webhook`) |
| Уведомления | Max Bot API (axios → `botapi.max.ru`) |
| Тесты | Vitest + React Testing Library |

## Backend — ключевые модули

| Модуль | Путь | Назначение |
|---|---|---|
| auth | `src/modules/auth/` | VK Silent Auth → JWT |
| masters | `src/modules/masters/` | профиль, карта оплаты |
| services | `src/modules/services/` | категории + услуги |
| schedule | `src/modules/schedule/` | график + генерация слотов |
| bookings | `src/modules/bookings/` | записи (CRUD + статусы) |
| payments | `src/modules/payments/` | история + VK Pay webhook |
| notifications | `src/modules/notifications/` | Max Bot + cron напоминания |
| reviews | `src/modules/reviews/` | отзывы + пересчёт рейтинга |

### Prisma-схема: `backend/prisma/schema.prisma`
Модели: `Master`, `Schedule`, `Category`, `Service`, `Client`, `Booking`, `Payment`, `Review`

### Статусы записи
`PENDING → CONFIRMED → COMPLETED`
`PENDING / CONFIRMED → CANCELLED`

### Статусы оплаты
`UNPAID → DEPOSIT_PAID → PAID`

## master-app — страницы

| Страница | Путь | Назначение |
|---|---|---|
| ProfilePage | `/` | главный экран, меню |
| AboutMePage | `/about` | имя, фото, контакты, описание |
| SchedulePage | `/schedule` | рабочие дни, часы, буфер |
| ServicesPage | `/services` | категории + услуги + BottomSheet |
| BookingsPage | `/bookings` | список/календарь записей |
| BookingDetailPage | `/bookings/:id` | детали + перенос + отмена |
| CreateBookingPage | `/bookings/new` | создание вручную |
| PaymentsPage | `/payments` | история платежей |
| PaymentSettingsPage | `/payment-settings` | карта + VK Pay |
| ChatsPage | `/chats` | клиенты + CRM-бот |

**Store:** `useAuthStore` — VK Auth → JWT → профиль мастера

## client-app — страницы (wizard записи)

| Страница | Путь | Назначение |
|---|---|---|
| MasterCardPage | `/?masterId=xxx` | карточка мастера (услуги/отзывы) |
| ServiceSelectPage | `/book/services` | выбор услуги |
| CalendarPage | `/book/calendar` | выбор дня → свободные слоты |
| ConfirmPage | `/book/confirm` | подтверждение деталей |
| DepositPage | `/book/deposit` | оплата депозита VK Pay |
| SuccessPage | `/book/success` | успех + добавить в календарь |
| MyBookingsPage | `/my-bookings` | мои записи (Будет / Прошло) |
| BookingDetailPage | `/my-bookings/:id` | детали + перенос + отмена |

**Store:** `useBookingStore` — wizard-состояние (masterId, service, date, time)

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
```

### master-app/.env / client-app/.env
```
VITE_VK_APP_ID
VITE_API_URL
```

## Важные детали

- Цены хранятся в **копейках** (int), отображаются делением на 100
- Время хранится строкой `"HH:mm"`, дата — `"YYYY-MM-DD"`
- Рабочие дни: `1=Пн ... 7=Вс` (ISO, не JS-формат где 0=Вс)
- JWT payload: `{ userId, vkUserId, role: 'master' | 'client' }`
- Напоминания клиентам отправляются за 24 часа через cron (`POST /api/notifications/reminders` с заголовком `x-cron-secret`)
- client-app открывается с query-параметром `?masterId=xxx` — точка входа для клиента
- `remind: boolean` в `useBookingStore` — переключатель "Напомнить за 1 час" на CalendarPage
- Скидки: `discountPercent` (0–100%), отображаются как `% скидки` красным бейджем
- `workPhotos: ServicePhoto[]` на Service — фото работ, хранятся в S3 папке `work/`

## Продакшн (Yandex Cloud)

| Ресурс | Значение |
|---|---|
| VM IP | `158.160.244.151` |
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

### Seed-данные (уже залиты в прод)
- Мастера: **Анна Смирнова** (`vkUserId=100001`), **Дмитрий Козлов** (`vkUserId=100002`)
- Клиенты: Мария Иванова, Алексей Петров, Екатерина Соколова (`vkUserId=200001–200003`)
- 8 услуг, 7 записей (разные статусы), 3 отзыва, 3 платежа
- Локальный скрипт: `cd backend && npm run db:seed`

## Prisma-миграции

| Имя | Что делает |
|---|---|
| `20260320000000_init` | Все базовые таблицы |
| `20260325120000_api_v2` | +lat/lng у masters, +discount_percent/duration_max у services, +master_photos |
| `20260326000000_service_photos` | +service_photos (фото работ) |

## client-app — BottomNav (4 вкладки)

`Каталог (/)` / `Записи (/my-bookings)` / `Сообщения (/messages)` / `Контакты (/contacts)`
Бейдж на "Записи" — количество предстоящих записей.

## Локальная разработка — MinIO

```bash
docker-compose up -d minio minio-init
# Бакет crm4max-media создаётся автоматически, публичный
# S3 API: http://localhost:9000
# Web-консоль: http://localhost:9001 (crm4max / crm4max123)
```
