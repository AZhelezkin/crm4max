# Архитектура CRM4Max

## Описание
CRM-система для самозанятых мастеров красоты (салоны, парикмахерские, барбершопы) в мессенджере Max.
Целевая аудитория: ИП и самозанятые в России.

---

## Компоненты системы

| Компонент | Описание |
|---|---|
| `master-app` | Мини-приложение мастера (личный кабинет) в Max |
| `client-app` | Мини-приложение клиента (запись на услуги) в Max |
| `backend` | REST API сервер, связывающий оба приложения |

---

## Стек технологий

| Слой | Технология |
|---|---|
| Mini-apps (оба) | React 18 + TypeScript + Vite + Zustand + React Router v6 |
| Max SDK | @vkontakte/vk-bridge |
| Бэкенд | Node.js + Fastify 4 + TypeScript |
| БД | PostgreSQL |
| ORM | Prisma 5 |
| Кеш / очереди | Redis |
| Хранилище файлов | S3-совместимое (AWS S3 / Yandex Object Storage / MinIO) |
| Авторизация | VK Silent Auth (токен от Max) → JWT (`@fastify/jwt`) |
| Оплата | VK Pay (webhook) |
| Уведомления | Max Bot API |
| Тесты | Vitest + React Testing Library |

---

## Структура проекта

```
crm4max/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── modules/
│       │   ├── auth/          # VK Silent Auth → JWT
│       │   ├── masters/       # профиль мастера, карта оплаты
│       │   ├── services/      # категории + услуги + фото работ
│       │   ├── schedule/      # график + генерация слотов
│       │   ├── bookings/      # записи (CRUD + статусы)
│       │   ├── payments/      # история + VK Pay webhook
│       │   ├── notifications/ # Max Bot + cron напоминания
│       │   └── reviews/       # отзывы + пересчёт рейтинга
│       ├── lib/
│       │   └── s3.ts          # AWS SDK v3 upload/delete
│       ├── middleware/
│       │   └── auth.middleware.ts
│       ├── db/
│       │   └── client.ts      # Prisma client singleton
│       └── app.ts
├── master-app/
│   └── src/
│       ├── pages/             # ProfilePage, ServicesPage, BookingsPage, ...
│       ├── components/        # Button, Card, Input, PageHeader, BottomNav
│       ├── store/             # useAuthStore
│       ├── api/               # masters, services, schedule, bookings, upload
│       └── types/index.ts
├── client-app/
│   └── src/
│       ├── pages/             # MasterCardPage, CalendarPage, ConfirmPage, ...
│       ├── components/        # Button, Card, PageHeader, BottomNav
│       ├── store/             # useAuthStore, useBookingStore
│       ├── api/               # masters, bookings
│       └── types/index.ts
├── ARCHITECTURE.md
├── PRD.md
└── CLAUDE.md
```

---

## Модели данных

### Master (Мастер)
- `id`, `vk_user_id`, `name`, `photo`, `description`, `contacts`, `location`, `lat`, `lng`
- `rating` (пересчитывается при добавлении отзыва)
- `card_number`, `vk_pay_linked`
- Связи: `Schedule`, `Category[]`, `Service[]`, `Booking[]`, `Review[]`, `MasterPhoto[]`

### MasterPhoto (Фото мастера)
- `id`, `master_id`, `url`, `order`
- Хранится в S3, URL сохраняется в БД

### Schedule (График работы)
- `id`, `master_id`
- `working_days[]` — массив чисел 1=Пн…7=Вс
- `start_time`, `end_time` — строки `"HH:mm"`
- `break_start`, `break_end` — опциональный перерыв
- `buffer_minutes` — буфер между записями

### Category (Категория услуг)
- `id`, `master_id`, `name`, `description`, `photo`
- Связи: `Service[]`

### Service (Услуга)
- `id`, `master_id`, `category_id`, `name`, `description`
- `duration_min`, `duration_max` — длительность в минутах (диапазон)
- `price` — в **копейках** (int)
- `discount_percent` — скидка 0–100% (не фиксированная цена)
- `photo`, `is_active`
- Связи: `ServicePhoto[]` (фото примеров работ), `Booking[]`

### ServicePhoto (Фото работ услуги)
- `id`, `service_id`, `url`, `order`
- Хранится в S3 в папке `work/`

### Client (Клиент)
- `id`, `vk_user_id`, `name`, `phone`, `photo`
- Связи: `Booking[]`, `Review[]`

### Booking (Запись)
- `id`, `master_id`, `client_id`, `service_id`
- `date` — строка `"YYYY-MM-DD"`, `time` — строка `"HH:mm"`
- `status`: `PENDING → CONFIRMED → COMPLETED` / `CANCELLED`
- `payment_status`: `UNPAID → DEPOSIT_PAID → PAID`
- `deposit_amount`, `notes`

### Payment (Платёж)
- `id`, `booking_id`, `amount` (копейки), `method` (`CARD` | `VK_PAY`), `status`

### Review (Отзыв)
- `id`, `master_id`, `client_id`, `booking_id`, `rating` (1–5), `text`

---

## API модули бэкенда

| Модуль | Путь | Ключевые эндпоинты |
|---|---|---|
| auth | `/api/auth` | `POST /vk` — VK Silent Auth → JWT |
| masters | `/api/masters` | `GET /me`, `PUT /me`, `PUT /me/payment`, `GET /:id` (публичный) |
| services | `/api/services` | CRUD категорий (`/categories`) и услуг, `POST /:id/photos`, `DELETE /photos/:photoId` |
| schedule | `/api/schedule` | `GET /me`, `PUT /me`, `GET /:masterId/slots?date&serviceId` (публичный) |
| bookings | `/api/bookings` | `POST /`, `GET /`, `GET /:id`, `POST /:id/reschedule`, `POST /:id/cancel`, `POST /:id/confirm-payment` |
| payments | `/api/payments` | `GET /`, `POST /vk-webhook` |
| notifications | `/api/notifications` | `POST /reminders` (cron, защищён `x-cron-secret`) |
| upload | `/api/upload` | `POST /?folder=masters|categories|services|work` → S3 URL |
| reviews | `/api/reviews` | `POST /`, `GET /?masterId=` |

**Важно:** Fastify использует radix-tree роутер — маршрут `/me` не перехватывается `/:id` независимо от порядка регистрации.

---

## S3 хранилище

Файлы загружаются через `POST /api/upload?folder=<папка>`, возвращается публичный URL.

| Папка | Назначение |
|---|---|
| `masters` | Фото профиля мастера |
| `categories` | Обложки категорий |
| `services` | Фото-обложки услуг |
| `work` | Примеры работ (workPhotos) |

Поддерживаемые хранилища: AWS S3, Yandex Object Storage, MinIO (через `S3_ENDPOINT`).
CDN URL настраивается через `S3_PUBLIC_URL`.

---

## master-app — страницы

| Страница | Путь | Назначение |
|---|---|---|
| ProfilePage | `/` | главный экран: список услуг, кнопки действий |
| OnboardingPage | `/onboarding` | первичная настройка: профиль → график → услуги |
| AboutMePage | `/about` | редактирование имени, фото, контактов, описания |
| SchedulePage | `/schedule` | рабочие дни, часы, перерыв, буфер |
| ServicesPage | `/services` | категории + услуги + фото работ (BottomSheet) |
| BookingsPage | `/bookings` | список/календарь записей |
| BookingDetailPage | `/bookings/:id` | детали записи + перенос + отмена + подтверждение оплаты |
| CreateBookingPage | `/bookings/new` | создание записи вручную |
| PaymentsPage | `/payments` | история платежей |
| PaymentSettingsPage | `/payment-settings` | карта + VK Pay |

**Store:** `useAuthStore` — VK Silent Auth → JWT → профиль мастера

**Загрузка фото:** `uploadPhoto(file, folder)` из `api/upload.api.ts` — использует `fetch` напрямую (не axios), чтобы браузер корректно выставил `multipart/form-data` с boundary.

---

## client-app — страницы

| Страница | Путь | Назначение |
|---|---|---|
| MasterCardPage | `/?masterId=xxx` | карточка мастера: Услуги / Фото / Отзывы + кнопки действий |
| ServiceSelectPage | `/book/services` | выбор услуги |
| CalendarPage | `/book/calendar` | шаг 1: выбор даты (сетка месяца) → шаг 2: выбор слота + тоггл напоминания |
| ConfirmPage | `/book/confirm` | подтверждение: блоки мастер / услуга / дата / время с кнопками редактирования |
| DepositPage | `/book/deposit` | оплата депозита VK Pay |
| SuccessPage | `/book/success` | «Вы записаны!»: бейдж оплаты, 4 кнопки действий, «Оплатить» |
| MyBookingsPage | `/my-bookings` | сетка месяца с точками на занятых днях + хронологический список |
| BookingDetailPage | `/my-bookings/:id` | детали записи: бейдж оплаты, 4 кнопки (перенос/редакт/чат/отмена) |
| MessagesPage | `/messages` | чаты (заглушка) |
| ContactsPage | `/contacts` | контакты (заглушка) |

**Нижняя навигация (`BottomNav`):** Каталог / Записи (с бейджем) / Сообщения / Контакты — отображается на MasterCardPage, MyBookingsPage, MessagesPage, ContactsPage.

**Store:**
- `useAuthStore` — VK Silent Auth → JWT → профиль клиента
- `useBookingStore` — wizard-состояние: `masterId`, `service`, `date`, `time`, `remind` (булево, включает напоминание за 1 час через Max Bot)

---

## Взаимодействие компонентов

```
Max Messenger
├── master-app  ──► REST API ──► Backend ──► PostgreSQL
│                               │           Redis (кеш слотов)
└── client-app  ──► REST API ──┘
                                │
                           Max Bot API
                      (уведомления: запись / перенос /
                       отмена / напоминание за 24 ч)
                                │
                            VK Pay
                      (депозит / полная оплата)
                                │
                          S3-хранилище
                      (фото мастеров, категорий,
                       услуг, примеры работ)
```

---

## Цены и форматы

- Цены хранятся в **копейках** (int), отображаются делением на 100
- Скидка хранится как **процент** (`discount_percent: 0–100`), итоговая цена: `round(price * (1 - pct/100))`
- Время: строка `"HH:mm"`, дата: `"YYYY-MM-DD"`
- Рабочие дни: `1=Пн … 7=Вс` (ISO, не JS-формат)
- JWT payload: `{ userId, vkUserId, role: 'master' | 'client' }`

---

## Сценарии мастера

1. **Онбординг** — первичная настройка: фото + имя → график → категории + услуги
2. **Профиль** — редактирование имени, фото, контактов, описания, локации
3. **График** — рабочие дни, часы, перерыв, буфер между клиентами
4. **Услуги** — категории (фото + название + описание) и услуги (длительность мин/макс, цена, скидка %, фото работ)
5. **Карта оплаты** — привязка карты или VK Pay
6. **Записи** — календарь/список, подтверждение оплаты, перенос, отмена
7. **Создание записи вручную** — мастер сам создаёт запись для клиента
8. **Платежи** — история с фильтрацией по статусу

## Сценарии клиента

1. **Карточка мастера** — фото, рейтинг, описание; табы «Услуги» / «Фото» (workPhotos) / «Отзывы»
2. **Запись** — выбор услуги → выбор даты (сетка месяца) → выбор слота + тоггл «Напомнить за 1 час» → экран подтверждения
3. **Оплата** — опциональный депозит через VK Pay
4. **После записи** — бейдж статуса оплаты, кнопки: добавить в календарь / написать мастеру / отменить
5. **Мои записи** — сетка месяца с точками на занятых днях + список (прошлые зачёркнуты)
6. **Детали записи** — статус оплаты, перенос, отмена (с правилами)
