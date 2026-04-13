# CRM4Max — Project Context

## Описание
CRM-система для самозанятых мастеров красоты в мессенджере Max.

## Демо и ссылки

- **GitHub Pages:** https://azhelezkin.github.io/crm4max/ (деплой при пуше в `master`)
- **Бот:** вебхук `POST /api/bot/webhook`, событие `bot_started`
- Max Bot API: `POST /messages?chat_id=<id>` (chat_id в query, не в body)

Сценарии `startapp` (`update.payload`): пусто/`qr` → QR сканер, UUID → запись к мастеру, `mmode` → кабинет мастера.

## Структура

```
backend/        — REST API (Fastify + Prisma + PostgreSQL)
master-app/     — мини-приложение мастера (React + Vite) + встроенный ClientApp
client-app/     — мини-приложение клиента (React + Vite)
infra/          — docker-compose.prod.yml, deploy.sh, nginx
```

## Стек

- **backend:** Node.js, Fastify, TypeScript, Prisma, PostgreSQL, Redis
- **frontend:** React 18, TypeScript, Vite, Zustand, React Router v6
- **auth:** Max Silent Auth → JWT (`@fastify/jwt`)
- **оплата:** VK Pay (`POST /api/payments/vk-webhook`)
- **уведомления:** Max Bot API (axios → `botapi.max.ru`)
- **тесты:** Vitest + React Testing Library

## Ключевые архитектурные решения

**Разделение мастер-данных:**
- `creator_masters` — данные из Max (max_user_id PK, first_name, last_name, username). Обновляется при каждой авторизации.
- `masters` — бизнес-профиль (name, photo, phone, description, location). Заполняется мастером, при входе не перезаписывается.

**master-app — два режима** (`window.WebApp.initDataUnsafe.start_param`):
- `mmode` → MasterApp
- Остальное → встроенный ClientApp (`src/client/`)

Тема: `document.documentElement.dataset.theme` = `'client'` | `'master'`

**Статусы:** записи: `PENDING → CONFIRMED → COMPLETED / CANCELLED`; оплата: `UNPAID → DEPOSIT_PAID → PAID`

## Важные соглашения

- Цены в **копейках** (int), отображение делением на 100
- Время: `"HH:mm"`, дата: `"YYYY-MM-DD"`
- Рабочие дни: `1=Пн ... 7=Вс` (ISO)
- JWT payload: `{ userId, maxUserId, role: 'master' | 'client' }`
- `isOnboarded` — флаг завершения онбординга мастера
- `discountPercent` (0–100%) — скидки, красный бейдж
- `workPhotos: ServicePhoto[]` — фото работ в S3 папке `work/`
- `remind: boolean` в `useBookingStore` — напоминание за 1 час
- Напоминания за 24ч через cron: `POST /api/notifications/reminders` + `x-cron-secret`
- `window.WebApp.openCodeReader(fileSelect: boolean)` — QR-сканер Max Bridge

## Продакшн (Yandex Cloud)

| Ресурс | Значение |
|---|---|
| VM IP | `158.160.244.151` |
| API URL | `https://158-160-244-151.sslip.io` |
| SSH | `~/.ssh/crm4max_deploy` (user: ubuntu) |
| Registry | `cr.yandex/crp6mv57ms1a67he7ukv` |
| S3 | `crm4max-media`, endpoint `https://storage.yandexcloud.net` |

Деплой: `SSH_KEY=~/.ssh/crm4max_deploy VM_HOST=158.160.244.151 YC_REGISTRY_ID=crp6mv57ms1a67he7ukv bash infra/deploy.sh`

CI/CD: `deploy.yml` при пуше в `main` (backend/infra) → тесты → Docker → Yandex Registry → SSH → health check.

## Требования к вёрстке

- **Источник истины — SVG-макеты** в `design/`. Не придумывай свои решения — бери цвета, размеры шрифтов, отступы, иконки, порядок, расположение элементов строго из макета. Если ты понимаешь, что они противоречат текущей логике приложения или не точны, то задавай мне уточняющие вопросы.
- Перед вёрсткой экрана **извлеки из SVG**: координаты элементов, fill/stroke цвета, размеры rect/circle, пути иконок (path d=). Рассчитай отступы между элементами по разнице координат.
- **Шрифты и отступы**: fontSize, fontWeight, lineHeight, marginTop/gap — вычисляй из координат элементов в макете. **Перед тем как написать любое числовое значение в стилях**, покажи расчёт: координата A, координата B, разница = значение. Никогда не ставь значения «на глаз» или по привычке.
- **Иконки**: используй точные SVG path из макета. Не заменяй иконки на похожие, не используй Unicode-символы вместо SVG.
- **Цвета**: только из макета. Не подставляй «близкие» цвета (#FF9500 вместо #F0AF2D и т.п.).
- **Элементы**: не добавляй блоки/кнопки/тексты/иконки, которых нет в макете. Не убирай и не игнорируй то, что есть — каждый элемент макета должен быть реализован.
- **Позиционирование**: всегда проверяй x/y координаты элементов в макете, чтобы определить их расположение (лево/право/центр). Не угадывай позицию — вычисляй из координат. Если два элемента имеют близкие y-координаты — они на одной строке, группируй их в один flex-row контейнер.
- Стили пишем **inline style** (React), без CSS-файлов.
- Тёмная тема: фон `#0F0F11`, карточки `#1C1C1E` или `#25262B`, текст `#D3D4D6`, вторичный `#7D7D7F` / `#8E8E93`.
- Максимально используй компоненты из MAX UI (https://dev.max.ru/ui) если имеются подходящие
## Запуск и тесты

```bash
docker-compose up -d          # PostgreSQL + Redis + MinIO (S3: localhost:9000, консоль: localhost:9001)
cd backend && npm run dev     # npm run db:migrate, npm run db:seed
cd master-app && npm run dev
cd client-app && npm run dev
```
