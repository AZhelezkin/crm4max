# CRM4Max — Project Context

## Язык общения
Всегда отвечать пользователю по-русски.

## Описание
CRM-система для самозанятых мастеров красоты в мессенджере Max.

## Демо и ссылки

- **GitHub Pages:** https://azhelezkin.github.io/crm4max/ (деплой при пуше в `master`)
- **Боты — два:** `id9706002253_bot` (мастер-кабинет) и `id9706002253_1_bot` (клиент / запись).
  - Webhook'и: `POST /api/bot/master/webhook` и `POST /api/bot/client/webhook` (старый `/api/bot/webhook` оставлен как алиас на мастер-бот, до перенастройки кабинета Max).
  - Event: `bot_started`. Если мастер пишет в клиент-бот (или клиент — в мастер-бот), бот отвечает ссылкой на «свой» бот.
  - Уведомления о записях: мастеру через master-бот, клиенту через client-бот.
- Max Bot API: `POST /messages?chat_id=<id>` (chat_id в query, не в body).

Сценарии `startapp` (`update.payload`):
- мастер-бот: `mmode` → кабинет мастера.
- клиент-бот: пусто/`qr` → QR-сканер, UUID → запись к конкретному мастеру.

Ссылка для шеринга от мастера (ShareLinkPage, QR-код) — всегда на клиентский бот: `https://max.ru/id9706002253_1_bot?startapp=<masterId>`.

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
| VM IP | `81.26.186.235` (static, reserved as `crm4max-static`) |
| VM ID | `fv4852jssl97dhckkjkg` |
| API URL | `https://81-26-186-235.sslip.io` |
| SSH | `~/.ssh/crm4max_deploy` (user: ubuntu) |
| Registry | `cr.yandex/crp6mv57ms1a67he7ukv` |
| S3 | `crm4max-media`, endpoint `https://storage.yandexcloud.net` |
| Managed PG | `crm4max-pg` (`c9q4otmferkauueju72n`), host `rc1d-mccl9656o7v0rrab.mdb.yandexcloud.net:6432` |

Деплой: `SSH_KEY=~/.ssh/crm4max_deploy VM_HOST=81.26.186.235 YC_REGISTRY_ID=crp6mv57ms1a67he7ukv bash infra/deploy.sh`

CI/CD: `deploy.yml` при пуше в `main` (backend/infra) → тесты → Docker → Yandex Registry → SSH → health check.

## Требования к вёрстке

- **Глобальный стиль страницы**: каждый экран автоматически получает фон-градиент (`--gradient-hero-background`: surface→background, length-stops 0→390px) и скругление верхних углов 24px — оно зашито в `#root > div` (MaxUI-обёртка) в `master-app/src/index.css`. **Не дублировать** на page-уровне (`<div minHeight: '100dvh'>`) — оставлять wrapper прозрачным. Кастомные hero-блоки (как в `MasterCardPage`/`ProfilePage`) могут иметь свой `borderTop{Left,Right}Radius:24` + gradient + декор (circles + blur) — они совпадают с body-уровневыми и не создают двойного эффекта; в cutout углов просвечивает `<body>` с плоским `--color-background`.
- **Источник истины — SVG-макеты** в `design/`. Не придумывай свои решения — бери цвета, размеры шрифтов, отступы, иконки, порядок, расположение элементов строго из макета. Если ты понимаешь, что они противоречат текущей логике приложения или не точны, то задавай мне уточняющие вопросы.
- Перед вёрсткой экрана **извлеки из SVG**: координаты элементов, fill/stroke цвета, размеры rect/circle, пути иконок (path d=). Рассчитай отступы между элементами по разнице координат.
- **Шрифты и отступы**: fontSize, fontWeight, lineHeight, marginTop/gap — вычисляй из координат элементов в макете. **Перед тем как написать любое числовое значение в стилях**, покажи расчёт: координата A, координата B, разница = значение. Никогда не ставь значения «на глаз» или по привычке.
- **Иконки**: используй точные SVG path из макета. Не заменяй иконки на похожие, не используй Unicode-символы вместо SVG.
- **Цвета**: только из макета. Не подставляй «близкие» цвета (#FF9500 вместо #F0AF2D и т.п.).
- **Элементы**: не добавляй блоки/кнопки/тексты/иконки, которых нет в макете. Не убирай и не игнорируй то, что есть — каждый элемент макета должен быть реализован.
- **Позиционирование**: всегда проверяй x/y координаты элементов в макете, чтобы определить их расположение (лево/право/центр). Не угадывай позицию — вычисляй из координат. Если два элемента имеют близкие y-координаты — они на одной строке, группируй их в один flex-row контейнер.
- **Контрольная сумма при фиксированных размерах**: если у контейнера задан фиксированный `height`/`width` c `box-sizing: border-box`, **обязательно** сложи все внутренние размеры (padding + margin + высота/ширина каждого дочернего элемента) и убедись, что сумма **точно равна** заданному размеру. Не коммить код, пока сумма не сойдётся — иначе padding «съедается» и элементы прижимаются к краю.
- Стили пишем **inline style** (React), без CSS-файлов.
- **Цвета — только через дизайн-токены MAX UI**, без хардкод-хексов в компонентах:
  - **Палитра** (`master-app/src/styles/tokens.json` → `tokens.ts`) — базовый набор хексов из Figma (`blue50`, `red50`, `calmindigo80` и т.п.).
  - **Семантический слой** (`master-app/src/styles/Dark.tokens.json` + `Light.tokens.json` → `theme.ts`) — две темы Dark/Light с одинаковыми ключами (`surface`, `onSurface`, `primarySurface`, `errorSurfaceAccented` и т.д.). По умолчанию Dark, переключение через `<html data-theme="light">`.
  - В компонентах использовать **CSS-переменные** из `master-app/src/index.css` — они автоматически меняются при смене темы:
    - Поверхности: `var(--color-background)`, `var(--color-surface)`, `var(--color-secondary-surface)`, `var(--color-pattern-element)`
    - Текст: `var(--color-on-surface)`, `var(--color-on-surface-secondary)`, `var(--color-on-surface-muted)`, `var(--color-on-primary-surface)`
    - Акценты: `var(--color-primary-surface)`, `var(--color-active-surface)`, `var(--color-active-element)`
    - Состояния: `var(--color-error-surface-accented)` / `--color-error-surface-lite`, `--color-success-surface-accented` / `--color-success-surface-lite`, `--color-warning-surface-accented` / `--color-warning-surface-lite`
    - Разделители: `var(--color-divider-low)`, `var(--color-divider-mid)`
    - Градиенты: `var(--color-grad-violet-0/100)`, `--color-grad-mint-0/100`, `--color-grad-peach-0/100`, `--color-grad-green-0/100`, `--color-grad-green-vibrance-0/100`
  - Прямой импорт `import { theme } from '@/styles/theme'` или `import { colors } from '@/styles/tokens'` — только там, где CSS var не работает: canvas API (QR-код).
- При добавлении нового семантического токена: обновлять синхронно `Dark.tokens.json`, `Light.tokens.json`, `theme.ts` (`darkTheme` + `lightTheme`) и `index.css` (`:root[data-theme="dark"]` + `[data-theme="light"]`).
- **Типографика — только через text-стили** из `master-app/src/styles/typography.ts` (`import { text } from '@/styles/typography'`). Не писать `fontSize`/`fontWeight`/`lineHeight` руками.
  - `text.display` — 32/38/700, крупный hero-заголовок (Welcome, Deposit)
  - `text.h2` — 28/36/800 ls −0.84, имя в hero-карточке мастера (Figma «H2»)
  - `text.title` — 24/30/700, заголовок страницы
  - `text.titleSmall` — 20/26/700, заголовок раздела/портала
  - `text.headline` — 18/24/600, заголовок карточки
  - `text.callout1` — 17/24/700 ls −0.17, заголовок в карточке-листе (Figma «Callout 1»)
  - `text.callout2` — 14/20/700 ls −0.14, текст вторичных кнопок «+ Добавить …» (Figma «Callout 2»)
  - `text.body2` — 17/24/400 ls −0.17, крупный обычный текст, табы (Figma «Body 2»)
  - `text.body2Medium` — 17/24/500 ls 0.34, лейблы дней недели в календаре («Пн», «Вт»…) (Figma «_calendar2Day», 2% от font-size)
  - `text.subhead` — 16/22/600, подзаголовок, ярлык поля
  - `text.body` — 15/20/400, основной текст
  - `text.bodyStrong` — 15/20/600, выделенный основной текст (имя клиента, цена)
  - `text.action` — 14/18/500, текст кнопок, чипов, табов (legacy)
  - `text.caption2` — 14/16/500 ls −0.028, компактный второстепенный — chip-label, описания, счётчики (Figma «Caption 2»)
  - `text.footnote` — 13/18/400, пояснения под полями
  - `text.caption` — 12/16/500, бейджи, мелкие подписи
  - `text.label2Caps` — 12/14/600 UPPERCASE ls 0.24, крупный статус-бейдж — «% СКИДКИ» в услугах (Figma «Label 2 CAPS», 2% от font-size)
  - `text.caption3Caps` — 14/16/500 UPPERCASE ls 0.42, заголовок секции списка («ВОЛОСЫ») (Figma «Caption 3 CAPS», 3% от font-size)
  - `text.overline` — 11/14/600 UPPERCASE + letter-spacing, лейблы секций (legacy)
  - `text.label3Caps` — 10/14/800 UPPERCASE ls −0.2, узкий статус-бейдж «% СКИДКИ» в категориях (Figma «label 3 CAPS»)
  - Использование: `<div style={{ ...text.title, color: 'var(--color-on-surface)' }}>...</div>`. Цвет НЕ кладётся в text-стили — задаётся отдельно через CSS-переменную, иначе разные темы сломаются.
  - При добавлении нового размера обновлять `typography.ts` И таблицу выше синхронно.
- Максимально используй компоненты из MAX UI (https://dev.max.ru/ui) если имеются подходящие
## Запуск и тесты

```bash
docker-compose up -d          # PostgreSQL + Redis + MinIO (S3: localhost:9000, консоль: localhost:9001)
cd backend && npm run dev     # npm run db:migrate, npm run db:seed
cd master-app && npm run dev
cd client-app && npm run dev
```
