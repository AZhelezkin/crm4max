# План подключения Яндекс Метрики

## Цель

Добавить сбор продуктовых событий в мастерский и клиентский режимы mini-app, клиентский Max-бот и мастерский Max-бот с canonical Rasa runtime, не связывая прикладной код напрямую с конкретным транспортом Метрики и не отправляя персональные данные.

Этот документ фиксирует места подключения и реализованный baseline продуктовой аналитики для фокус-группы.

## Базовая архитектура

- [x] Добавить `VITE_YANDEX_METRICA_ID` в конфигурацию окружения. При отсутствии ID аналитика должна работать как `no-op`.
- [x] Добавить загрузку счётчика в `master-app/src/main.tsx` либо отдельный компонент `MetricsProvider`.
- [x] Создать `master-app/src/lib/metrics.ts` с типизированными функциями `trackEvent(name, params)` и `trackPageView(path, params)`.
- [x] Не обращаться к `window.ym` непосредственно из страниц и компонентов.
- [x] Очередь событий до готовности счётчика ограничить по размеру; ошибки Метрики не должны влиять на пользовательские сценарии.
- [x] Добавить dev-режим, который пишет события в консоль без отправки.
- [ ] Перед включением счётчика проверить требования к согласию и обновить тексты в `ConsentsPage` и юридических документах.
- [x] Выбрать один счётчик для обоих режимов и передавать параметр `app_mode: master | client`. Разные счётчики использовать только если отчёты должны быть полностью изолированы.
- [x] Для server-side событий ботов и backend outcomes создан типизированный адаптер с outbox/worker. HTTP API Метрики не вызывается непосредственно из webhook или CRM write boundary.
- [x] Для server-side событий используются закрытые `surface`: `master_app | client_app | backend`; существующие bot-события разделены по `bot_role`.
- [x] Server-side доставка реализована через Measurement Protocol с retry и идемпотентным outbox.
- [x] Для server-side событий создаётся случайный непрозрачный analytics visitor ID. `maxUserId`, `chatId`, `masterId` и CRM UUID не отправляются как параметры Метрики.
- [ ] Если потребуется сквозная воронка «бот → mini-app», связывать bot visitor ID с browser ClientID только после согласия пользователя и хранить связь на сервере; не передавать исходные provider/CRM ID в Метрику.

### Baseline фокус-группы

Источники рекламного привлечения, UTM и кампании на этом этапе не собираются. Сквозная воронка строится агрегатно по безопасным frontend-этапам и подтверждённым backend outcomes:

| Этап | Источник истины | Событие |
|---|---|---|
| Запуск и вход | frontend | `app_opened`, `auth_completed`, `auth_failed` |
| Регистрация мастера | backend | `master_registered` |
| Welcome и завершение онбординга | frontend/backend | `master_welcome_viewed`, `master_onboarding_completed` |
| Создание услуги или клиента | backend | `entity_create_result` |
| Выбор мастера, услуги, даты и времени | frontend | `client_master_opened`, `client_service_selected`, `client_booking_date_selected`, `client_booking_time_selected` |
| Создание обычной или пакетной записи | frontend/backend | frontend intent/result UI + `booking_create_result` |
| Перенос или отмена записи | backend | `booking_status_change_result` |
| Подтверждение оплаты записи | backend | `booking_payment_result` |
| Привязка карты | backend после `COMPLETED` | `subscription_card_binding_result` |
| Подтверждённая оплата подписки | backend | `subscription_payment_result` |

Browser ClientID и server-side visitor ID намеренно не связываются до отдельного решения по согласию. Поэтому baseline измеряет агрегатные конверсии и подтверждённые outcomes, но не рекламную атрибуцию по конкретному человеку.

## Правила данных

Нельзя отправлять:

- `maxUserId`, внутренние UUID мастера, клиента, записи, услуги и платежа;
- имя, телефон, username, адрес и координаты;
- комментарии к адресу, заметки и другой свободный текст;
- номер карты, токены авторизации и параметры Max Silent Auth;
- полный URL, если в нём могут быть deep-link ID или query-параметры.
- текст и транскрипт сообщений боту, Rasa slot values, callback payload, delivery ID и содержимое Rasa tracker;
- названия клиентов и услуг, даты/время записи и результаты CRM read-моделей из ответов ассистента;
- `scopeHash`/`deliveryHash` из runtime diagnostics: они предназначены для диагностики, а не продуктовой аналитики.

Разрешённые параметры:

- перечисления: `app_mode`, `source`, `period`, `status`, `booking_type`;
- булевы признаки: `has_address`, `has_apartment`, `has_floor`, `has_intercom`, `has_deposit`;
- небольшие числа: `services_count`, `route_stops_count`, `sessions_count`;
- заранее определённые диапазоны цены и длительности вместо точных значений;
- нормализованный шаблон маршрута, например `/bookings/:id`, без фактического ID.

Событие отправляется после успешного результата действия. Нажатия и ошибки при необходимости имеют отдельные события с суффиксами `_started` и `_failed`.

## Общие события

| Событие | Место подключения | Когда отправлять | Параметры |
|---|---|---|---|
| `app_opened` | `master-app/src/App.tsx`, после определения режима запуска | Один раз на запуск | `app_mode`, `launch_source: bot/deeplink/qr/direct` |
| `auth_completed` | master/client auth stores после успешного `init()` | После авторизации | `app_mode`, `is_new_user` |
| `auth_failed` | master/client auth stores | После окончательной ошибки | `app_mode`, `error_type` из закрытого списка |
| `page_viewed` | Новый tracker внутри `BrowserRouter` и `HashRouter` | При смене маршрута | `app_mode`, нормализованный `page` |

Точки подключения просмотров:

- мастерский router: `master-app/src/App.tsx`;
- клиентский router: `master-app/src/client/ClientApp.tsx`;
- нормализация динамических путей: `/bookings/:id`, `/income/:date`, `/my-bookings/:id`;
- query и hash-параметры с идентификаторами в Метрику не передавать.

## Воронка Мастера

### Онбординг и подписка

| Событие | Файл/обработчик | Условие |
|---|---|---|
| `master_welcome_viewed` | `pages/WelcomePage.tsx` | Первый показ welcome |
| `subscription_viewed` | `pages/SubscriptionPlanPage.tsx` | Показ тарифа |
| `subscription_checkout_started` | `SubscriptionPlanPage.handleConnect` | Перед переходом в платёжную форму |
| `trial_started` | `SubscriptionPlanPage.handleConnect` | Только после успешного `subscriptionApi.startTrial` |
| `subscription_payment_redirected` | `SubscriptionPlanPage.handleConnect` | После получения `paymentURL` |
| `subscription_cancelled` | `SubscriptionPlanPage.handleCancelSubscription` | После успешного API |
| `subscription_payment_returned` | `App.tsx`, `PaySuccessRoute`/`PayFailRoute` | Возврат из hosted-формы; параметр `result` |
| `subscription_activated` | backend notification/charge flow | Только по подтверждённому состоянию T-Bank, не по клиентскому redirect |

Для `subscription_activated` предусмотреть серверную отправку офлайн-конверсии либо безопасную очередь аналитических событий. Источник истины: webhook и фактический статус подписки.

### Настройка профиля

| Событие | Файл/обработчик | Параметры |
|---|---|---|
| `master_profile_saved` | `pages/AboutMePage.tsx`, `handleSave` | `has_photo`, `has_description`, `has_phone` |
| `master_address_saved` | `pages/AddressEditPage.tsx`, `handleSave` | `has_address`, `has_note` |
| `master_schedule_saved` | `pages/SchedulePage.tsx`, `handleSave` | `working_days_count`, `has_break` |
| `service_created` | редактор в `pages/ServicesPage.tsx`/`components/ServicesCatalog.tsx` | `has_discount`, `is_misc`, `sessions_count` |
| `service_updated` | тот же редактор после успешного API | те же признаки |
| `payment_method_saved` | `pages/PaymentSettingsPage.tsx` | `method_type` |

### Ручное создание и управление записью

| Событие | Файл/обработчик | Параметры |
|---|---|---|
| `master_booking_started` | вход в `pages/CreateBookingPage.tsx` | `source: home/calendar/client/reschedule` |
| `master_booking_location_selected` | переключатель «Где» в `CreateBookingPage` | `location_type: master/client` |
| `master_booking_address_completed` | сохранение `BookingAddressEditor` | `has_apartment`, `has_floor`, `has_intercom`, `has_comment` |
| `master_booking_created` | `CreateBookingPage.handleSave` после успешного API | `booking_type`, `services_count`, `has_address`, `remind`, `has_overlap` |
| `master_package_created` | `CreateBookingPage.handleSavePackage` | `sessions_count`, `has_address`, `remind` |
| `master_booking_create_failed` | `handleSave`/`handleSavePackage` | `booking_type`, нормализованный `error_type` |
| `master_booking_rescheduled` | `handleReschedule`/`handleEditTime` после успешного API | `change_type: date/time` |
| `master_booking_cancelled` | `BookingDetailPage.handleCancel` и HomePage action | `source: detail/home` |
| `master_booking_marked_paid` | `BookingDetailPage.handleConfirmPayment` | `payment_status_before` |
| `master_booking_reminder_sent` | `HomePage.handleRemind` | `source: home` |
| `booking_added_to_calendar` | `BookingDetailPage.handleAddToCalendar`, success-экран | `app_mode: master`, `platform` |

### Главная и распространение

| Событие | Файл/обработчик | Параметры |
|---|---|---|
| `day_route_opened` | `pages/HomePage.tsx`, `handleOpenDayRoute` | `route_stops_count`, `origin_type: address/coordinates`, `selected_day: today/other` |
| `booking_route_opened` | `BookingDetailPage.handleOpenAddress`, success-экран CreateBookingPage | `origin_type`, `source` |
| `share_page_opened` | `pages/ShareLinkPage.tsx` | без ID мастера |
| `share_link_copied` | `ShareLinkPage.handleCopy` | `source: button/fallback` |
| `share_link_sent` | `ShareLinkPage.handleShare` | `provider: max/system` |
| `share_qr_downloaded` | `ShareLinkPage.handleDownloadQR` | без URL и masterId |

## Воронка Клиента

### Поиск мастера и выбор услуги

| Событие | Файл/обработчик | Параметры |
|---|---|---|
| `client_master_opened` | `client/pages/MasterCardPage.tsx` после загрузки | `source: deeplink/qr/recent` |
| `client_qr_scan_started` | `client/pages/QRScanPage.tsx`, `handleScan` | без payload QR |
| `client_qr_scan_completed` | после валидного результата сканера | `result: valid/invalid/cancelled` |
| `client_booking_started` | `MasterCardPage.handleBook` | `entry: master/service` |
| `client_service_selected` | `ServiceSelectPage.handleSelect` | `has_discount`, `is_package`, `price_bucket` |
| `client_service_details_viewed` | `client/pages/ServiceDetailPage.tsx` | `is_package`, `has_photos` |

### Создание записи

| Событие | Файл/обработчик | Параметры |
|---|---|---|
| `client_booking_date_selected` | `CalendarPage.handleSelectDate` | `days_ahead_bucket` |
| `client_booking_time_selected` | `CalendarPage.handleSelectTime` | `time_bucket: morning/day/evening` |
| `client_booking_address_completed` | `AddressSuggestField` либо перед submit | `has_apartment`, `has_floor`, `has_intercom` |
| `client_booking_confirmed` | `ConfirmPage.handleConfirm` после успешного `bookingsApi.create` | `has_address`, `remind`, `has_deposit` |
| `client_package_confirmed` | `PackageBookingPage.handleSubmit` | `sessions_count`, `has_address`, `remind` |
| `client_booking_create_failed` | `ConfirmPage`/`PackageBookingPage` | `booking_type`, нормализованный `error_type` |
| `client_deposit_started` | `DepositPage.handlePay` | `amount_bucket` |
| `client_deposit_result` | после подтверждённого результата оплаты | `result: success/fail` |

### Действия с существующей записью

| Событие | Файл/обработчик | Параметры |
|---|---|---|
| `client_bookings_opened` | `client/pages/MyBookingsPage.tsx` | `filter`, `has_upcoming` |
| `client_booking_opened` | `client/pages/BookingDetailPage.tsx` после загрузки | `status`, `payment_status` |
| `client_booking_rescheduled` | `BookingDetailPage.handleReschedule` + успешный submit | без дат и времени |
| `client_booking_cancelled` | `BookingDetailPage.handleCancel` после успешного API | `status_before` |
| `client_booking_chat_opened` | `BookingDetailPage.handleChat` | `channel: max/internal` |
| `client_booking_route_opened` | address action в `BookingDetailPage` | `destination_type: client/master` |
| `booking_added_to_calendar` | `BookingDetailPage.handleAddToCalendar` | `app_mode: client`, `platform` |

## Метрика Max-ботов (`../max-bot`)

### Архитектура server-side событий

- [ ] Создать `src/lib/analytics/bot-analytics.ts`: типы событий, allow-list параметров, `trackBotEvent()` и `no-op` реализация.
- [ ] Создать provider-адаптер Яндекс Метрики отдельно от доменной логики, например `src/lib/analytics/yandex-metrica-provider.ts`.
- [ ] Использовать outbox/очередь с идемпотентностью. Webhook должен отвечать Max независимо от доступности Метрики.
- [ ] Не подменять продуктовую аналитику существующими `recordMaxBotWebhook`, `recordMaxBotDecision` и `MaxAssistantRuntimeDiagnostics`: диагностика может содержать технические hashes и при включённом флаге текст сообщений.
- [ ] Разрешить диагностическим recorders дополнительно вызывать безопасный analytics sink только через явное отображение диагностического события в продуктовый event. Никогда не пересылать diagnostic object целиком.
- [ ] Общие параметры каждого bot event: `surface`, `bot_role`, `environment`, `app_revision`; параметры пользователя и сообщения запрещены.
- [ ] Для длительностей отправлять диапазон `latency_bucket`, а не точное `durationMs`: `lt_500ms`, `500ms_2s`, `2s_5s`, `5s_15s`, `gte_15s`.
- [ ] Для повторных webhook/Rasa delivery событие результата отправлять один раз по idempotency key; сам ключ в Метрику не передавать.

### Запросы к обоим ботам

Точки входа находятся в `../max-bot/src/modules/bot/bot.routes.ts`:

- `POST /api/bot/master/webhook`;
- `POST /api/bot/client/webhook`;
- legacy `POST /api/bot/webhook`, который считается как `bot_role: master`, `endpoint: legacy`.

| Событие | Точка подключения | Когда отправлять | Безопасные параметры |
|---|---|---|---|
| `bot_webhook_received` | начало `handleWebhook`, после проверки webhook secret | Для каждого принятого HTTP-запроса | `bot_role`, `endpoint`, `update_type` |
| `bot_webhook_admission_result` | после `admitMaxWebhookUpdate` | После dedup/freshness решения | `bot_role`, `outcome: admitted/duplicate/stale/unavailable/not_applicable` |
| `bot_request_classified` | ветки `bot_started`, `message_created`, `message_callback` | После безопасной классификации | `input_kind: start/text/audio/contact/callback/command/empty`, `command_kind`, `payload_kind` |
| `bot_request_handled` | единая обёртка вокруг `handleWebhook` | После завершения сценария | `bot_role`, `handler_kind`, `outcome`, `latency_bucket` |
| `bot_request_failed` | единая error boundary webhook | При необработанной ошибке | `bot_role`, `handler_kind`, закрытый `error_code`, `latency_bucket` |
| `bot_provider_operation_result` | `src/lib/bot-messaging.ts`: send/edit/delete/answer/action result | После ответа Max Bot API | `bot_role`, `operation`, `outcome`, `status_class`, `message_kind` |
| `bot_support_started` | `/support` или `startapp=support` | После перехода в awaiting support | `bot_role`, `source: command/start_payload` |
| `bot_support_submitted` | после `sendChatwootSupportMessage` | После результата Chatwoot | `bot_role`, `outcome` |
| `bot_support_exited` | callback `SUPPORT_EXIT_PAYLOAD` | После очистки support state | `bot_role` |

`status_class` ограничить значениями `2xx`, `4xx`, `5xx`, `network`, `missing_token`, `invalid_request`. Точный текст ответа и provider message ID не отправлять.

### Мастерский бот: вход в canonical Rasa runtime

Фактическая цепочка:

1. `src/modules/bot/bot.routes.ts` принимает `bot_started`, text, audio или callback.
2. `max-rasa-master-adapter.ts` нормализует событие без выполнения бизнес-операции.
3. `max-rasa-master-adapter-http.ts` отправляет `POST /internal/max/master/events` в отдельный runtime.
4. `telegram-rasa-mvp/src/max/assistant-runtime-http.ts` валидирует secret и schema.
5. `assistant-runtime-handler.ts` проверяет identity, admission/dedup и сериализует turn.
6. `canonical-application-adapter.ts` и `canonical-application.ts` выбирают semantic decision.
7. Для CRM flow запрос идёт в Rasa, mutation показывает preview и требует callback-подтверждение.
8. `runtime-composition.ts` выполняет подтверждённый write и фиксирует `committed/rejected/replay/stale`.

События на транспортной границе:

| Событие | Файл/место | Параметры |
|---|---|---|
| `master_bot_input_received` | `assistant-runtime-handler.handle` рядом с `runtime_event_received` | `input_kind: start/text/audio/interaction` |
| `master_bot_runtime_dispatch_result` | `dispatchMaxRasaMaster` и `HttpMaxRasaMasterAdapter.handle` | `owner: canonical/legacy`, `outcome: accepted/declined/failed`, закрытый `error_code` |
| `master_bot_delivery_admission_result` | `assistant-runtime-handler.ts` | `outcome: accepted/duplicate_completed/duplicate_failed/in_progress/declined/unavailable` |
| `master_bot_turn_started` | `assistant-runtime-handler.ts`, начало `turns.run` | `input_kind`, `wait_bucket` |
| `master_bot_turn_completed` | там же после `execute`/`settle` | `input_kind`, `outcome`, `error_code`, `latency_bucket` |
| `master_bot_voice_result` | после `transcribeMaxAssistantAudio` | `outcome: transcribed/unsupported/too_long/too_large/invalid/empty/unavailable`, `duration_bucket` |

Не отправлять `text`, voice transcript, audio URL, callback payload, `deliveryId`, `scope`, `originMessageId`, `maxUserId`, `masterId` и `chatId`.

Старт и меню мастерского бота:

| Событие | Когда отправлять | Параметры |
|---|---|---|
| `master_bot_started` | Принят `bot_started` или `/start` | `source: bot_started/command`, `start_payload_kind` |
| `master_bot_registration_prompted` | Мастер не найден или не завершил onboarding | `source: start/message` |
| `master_bot_welcome_shown` | Canonical `presentWelcome` успешно доставил экран | `runtime_owner: canonical/legacy` |
| `master_bot_menu_opened` | Показано главное меню/меню управления | `menu: primary/management` |
| `master_bot_menu_action_selected` | Canonical interaction меню | allow-list `action: capabilities/clients/start_booking/calendar/services/analytics/schedule/help` |
| `master_bot_prompts_opened` | Команда `/prompts` или help action | `source: command/menu/semantic` |
| `master_bot_cabinet_link_shown` | Welcome/capabilities screen содержит `startapp=mmode` | `screen_kind` |

Нажатие обычной link-кнопки Max не всегда возвращает callback. Поэтому открытие кабинета подтверждаем событием `app_opened(app_mode=master, launch_source=bot)` в mini-app, а не считаем показ ссылки кликом.

### Мастерский бот: semantic router и Rasa

Главная точка semantic analytics уже существует: `recordSemanticRoute` в `telegram-rasa-mvp/src/max/canonical-application-adapter.ts`. Сейчас она пишет `max_semantic_route` в stdout; её нужно направить также в безопасный analytics sink.

Низкоуровневые запросы к Rasa и AI считаем отдельно от продуктового результата:

| Событие | Точка подключения | Параметры |
|---|---|---|
| `master_bot_rasa_request_result` | `telegram-rasa-mvp/src/rasa/client.ts`, единая обёртка `runCurl` | `operation: send_message/trigger_intent/seed_slot/get_tracker/reset_conversation`, `outcome`, `status_class`, `latency_bucket` |
| `master_bot_ai_request_result` | адаптеры `semantic-route`, entity resolver, Alice advisor и OpenAI bridge | `purpose: semantic_route/semantic_repair/entity_resolution/business_advisor/general_advisor/analytics`, `outcome`, `model_family`, `latency_bucket`, `input_tokens_bucket`, `output_tokens_bucket` |
| `master_bot_rasa_empty_response` | `rasa-text-turn.ts`/`empty-response-recovery.ts` | `active_lane`, `recovery: attempted/succeeded/failed` |

В `master_bot_ai_request_result` запрещены prompt, arguments tool call, ответ модели и точное число токенов. `model_family` берётся из закрытого списка конфигурации, а не из произвольной строки ответа.

| Событие | Когда отправлять | Параметры |
|---|---|---|
| `master_bot_semantic_route` | После окончательной canonicalization/reroute | `decision`, `effect`, `flow_id`, `analytics_mode`, `rerouted`, `active_context: none/flow/general/business` |
| `master_bot_rasa_flow_started` | Перед первым `continueRasa`/`triggerIntent` нового flow | `flow_id`, `lane: readonly/mutation`, `input_kind` |
| `master_bot_rasa_flow_continued` | При `decision=continuation` и активном Rasa flow | `flow_id`, `pending_field`, `lane` |
| `master_bot_rasa_flow_interrupted` | При запуске нового flow поверх активного | `from_flow_group`, `to_flow_id`, `from_lane`, `to_lane` |
| `master_bot_rasa_flow_mismatch` | `onFlowMismatch` в canonical adapter | `expected_flow_id`, `actual_flow_id`, `lane` |
| `master_bot_rasa_flow_result` | После Rasa response и чтения semantic state | `flow_id`, `outcome: awaiting_input/preview_ready/completed/cancelled/empty_response/failed`, `pending_field` |
| `master_bot_clarification_shown` | `presentClarification` | `alternatives_count`, без пользовательского текста |
| `master_bot_unsupported_shown` | `presentUnsupported` | `active_lane` |
| `master_bot_advisor_result` | Alice/general/business advisor boundary | `mode: general/business`, `outcome`, `latency_bucket` |
| `master_bot_analytics_result` | `presentAnalytics` | `analytics_mode`, `outcome`, `result_size_bucket` |

Разрешённый `flow_id` берётся только из `SEMANTIC_FLOW_IDS` и Rasa `flows.yml`. `pending_field` — только allow-list имён slot/collect, без slot value.

### Мастерский бот: сценарии Rasa, которые покрываем

#### Создание записей и клиентов

| Flow | Что измеряем по шагам | Финальная конверсия |
|---|---|---|
| `booking_create_existing` | старт → клиент → услуга → дата → слот/время → preview | `master_bot_confirmation_result(action_kind=booking_create_existing, outcome=committed)` |
| `booking_create_new_client` | старт → имя → телефон → услуга → дата → слот/время → preview | `action_kind=booking_create_new_client` |
| `client_create` | старт → имя → телефон → preview | `action_kind=client_create` |

Для шагов используем одно событие `master_bot_rasa_flow_result` с `pending_field`; значения имени, телефона, услуги, даты и времени не отправляются. Отдельно считаем `slot_selection_pending`, `client_not_found`, `service_not_found`, `invalid` как `validation_outcome` из закрытого списка.

#### Управление услугами

| Flow | Воронка | Финальная конверсия |
|---|---|---|
| `service_create` | название → длительность → цена → preview → confirm | `action_kind=service_create` |
| `service_update` | выбор услуги → поля изменения → preview → confirm | `action_kind=service_update` |
| `service_delete` | выбор услуги → preview → confirm | `action_kind=service_delete` |

Передавать только `changed_fields_count` и булевы `changes_name`, `changes_duration`, `changes_price`; названия и цены запрещены.

#### Изменение записей и графика

| Flow | Воронка | Финальная конверсия |
|---|---|---|
| `booking_cancel` | поиск записи → выбор при неоднозначности → preview → confirm | `action_kind=booking_cancel` |
| `booking_reschedule` | исходная запись → новая дата → свободный слот → preview → confirm | `action_kind=booking_reschedule` |
| `schedule_one_day` | дата → начало → конец → preview → confirm | `action_kind=schedule_one_day` |
| `schedule_day_off` | дата → preview → confirm | `action_kind=schedule_day_off` |
| `schedule_blocked_interval` | дата → начало → конец → preview → confirm | `action_kind=schedule_blocked_interval` |

Для конфликтов и stale-состояний отправлять только `outcome` и `reason: conflict/slot_unavailable/booking_stale/expired/scope_mismatch/other`.

#### Readonly CRM-сценарии

Одним событием `master_bot_read_result` покрыть:

- `who_next_view`;
- `remaining_day_view`;
- `bookings_day_view`, `bookings_week_view`;
- `schedule_day_view`, `schedule_week_view`, `schedule_month_view`;
- `client_card_view`, `client_count_view`, `clients_view`, `clients_page_view`;
- `services_view`;
- `availability_day_view`;
- `request_examples_view`.

Параметры: `flow_id`, `outcome: success/empty/not_found/clarification/failed`, `result_size_bucket: 0/1/2_5/6_10/gt_10`. Содержимое CRM-ответа не отправлять.

#### Подтверждения и callback-кнопки

Точки подключения находятся в `telegram-rasa-mvp/src/max/runtime-composition.ts` рядом с `recordConfirmationAttempt`/`recordConfirmationResult` и в `interaction-handler.ts`.

| Событие | Параметры |
|---|---|
| `master_bot_confirmation_shown` | `action_kind`, `flow_id` |
| `master_bot_confirmation_clicked` | `action_kind`, `interaction_kind: confirm/cancel/change/choice/navigation` |
| `master_bot_confirmation_result` | `action_kind`, `outcome: committed/rejected/replay/stale/missing_or_scope_mismatch`, `reason` |
| `master_bot_screen_opened` | allow-list `screen_kind`, `source_lane` |

Именно `master_bot_confirmation_result` с `outcome=committed` является продуктовой конверсией. Preview и клик не должны считаться успешной CRM-операцией.

### Клиентский бот: сценарии

Клиентский бот остаётся на `booking-agent` в `../max-bot/src/lib/booking-agent.ts`, а не на canonical Rasa runtime.

| Событие | Точка подключения | Параметры |
|---|---|---|
| `client_bot_started` | `bot_started` client branch | `start_source: empty/master_link/support/other` |
| `client_bot_master_context_result` | `startSessionForMaster`/`sendWelcomeClientWithMaster` | `outcome: selected/not_found/qr_fallback` |
| `client_bot_phone_requested` | `requestClientPhone` | `source: first_start/debug` |
| `client_bot_phone_result` | contact attachment handler | `outcome: saved/not_recognized/save_failed` |
| `client_bot_booking_input` | перед `handleBookingMessage` | `input_kind: text/voice` |
| `client_bot_booking_step` | результат `handleBookingMessage` и session transition | `from_step`, `to_step`, `missing_fields_count`, `outcome` |
| `client_bot_master_selection_shown` | agent вернул выбор мастеров | `options_count_bucket` |
| `client_bot_master_selected` | callback `SELECT_MASTER_PAYLOAD_PREFIX` | `outcome: selected/unavailable/no_user` |
| `client_bot_booking_preview_shown` | переход session в `CONFIRMING` | `has_service`, `has_date`, `has_time` |
| `client_bot_booking_changed` | callbacks change time/day/service | `field: time/day/service`, `outcome` |
| `client_bot_booking_cancelled` | `/cancel`, `booking_cancel`, `booking_cancel_all` | `stage: collecting/confirming/unknown` |
| `client_bot_booking_confirmed` | после успешного `confirmBooking` | `outcome: committed/rejected/failed` |
| `client_bot_voice_result` | после `transcribeAudio` | `outcome: transcribed/empty/failed`, `duration_bucket` |

Для `client_bot_booking_step` разрешены только `AWAITING_MASTER`, `COLLECTING`, `CONFIRMING` и синтетическое terminal-состояние `SESSION_CLEARED`. Не отправлять извлечённые service/date/time, историю GPT и `pendingText`.

### Уведомления обоих ботов

Точка подключения: `../max-bot/src/modules/notifications/notifications.service.ts` и транспорт `src/lib/bot-messaging.ts`.

| Событие | Параметры |
|---|---|
| `bot_notification_send_result` | `bot_role`, `notification_type: booking_created/booking_rescheduled/booking_cancelled/package_created/package_cancelled/reminder_1h/reminder_24h`, `outcome` |
| `bot_notification_deeplink_included` | `bot_role`, `notification_type`, `target: master_booking/client_booking` |

Событие `sent` ставить только после успешного ответа Max Bot API. Отсутствие `chatId` считать `outcome=no_recipient`, а не успешной отправкой.

### CI/CD для bot analytics

Текущий pipeline `../max-bot/.gitlab-ci.yml` уже проверяет backend и `telegram-rasa-mvp`, собирает отдельные runtime/Rasa images и имеет diagnostics job. Добавить:

- [ ] В test job задать `BOT_ANALYTICS_ENABLED=false`, чтобы unit/integration тесты не обращались к реальной Метрике.
- [ ] Unit-тесты allow-list/redaction: text, transcript, slot values, callback payload и provider/CRM ID не проходят в provider payload.
- [ ] Contract-тест, что каждый `SEMANTIC_FLOW_IDS` имеет analytics mapping и lane.
- [ ] Contract-тест, что каждый mutation result kind отображается в разрешённый `action_kind`.
- [ ] Тест идемпотентности: duplicate webhook, replay delivery и повторный callback не создают вторую конверсию.
- [ ] Тест отказоустойчивости: timeout/4xx/5xx Метрики не меняет HTTP-ответ webhook и не блокирует CRM write.
- [ ] Тест транспортных результатов Max API: `sent`, `provider_rejected`, `transport_error`, `missing_token`.
- [ ] Добавить артефакт `bot-analytics-contract-report.json` без текстов сообщений и идентификаторов.
- [ ] В deploy job передавать `BOT_ANALYTICS_ENABLED`, `YANDEX_METRICA_COUNTER_ID`, endpoint и секрет provider через protected variables; секрет должен быть masked.
- [ ] Не печатать analytics secret в блоке runtime flags. Текущий фильтр уже исключает `TOKEN|SECRET|PASSWORD|KEY|CREDENTIAL`, сохранить это правило.
- [ ] В `max-rasa-diagnostics` не смешивать diagnostics dump и выгрузку продуктовых событий; проверять только counters/outbox health.

### Основные bot-воронки в отчётах

1. Мастер, первая ценность: `master_bot_input_received → master_bot_semantic_route → master_bot_read_result(success)`.
2. Мастер, CRM-изменение: `semantic_route(write) → rasa_flow_started → confirmation_shown → confirmation_clicked → confirmation_result(committed)`.
3. Качество Rasa: `flow_started → awaiting_input/preview_ready/completed`, отдельно mismatch, clarification, cancelled и failed.
4. Голос: `input_received(audio) → voice_result(transcribed) → turn_completed`.
5. Клиентская запись в боте: `client_bot_started → master_selected → booking_step(COLLECTING) → preview_shown → booking_confirmed(committed)`.
6. Доставка уведомлений: бизнес-событие → `bot_notification_send_result(sent/no_recipient/failed)` по роли и типу.
7. Надёжность запросов: `bot_webhook_received → admission_result(admitted) → request_handled`; duplicates и failures выводить отдельно.

## События Backend

Критические бизнес-события должны считаться по серверному результату, а не только по клику:

- создание обычной записи и курса;
- отмена, перенос и завершение записи;
- успешная оплата депозита;
- запуск trial, активация, продление, grace и блокировка подписки;
- успешная отправка уведомлений и напоминаний.

План подключения:

- [ ] Добавить таблицу/outbox аналитических событий либо использовать существующую надёжную очередь.
- [ ] Создавать событие в той же транзакции, что и изменение бизнес-сущности.
- [ ] Добавить идемпотентный ключ, но не передавать его в параметры отчётов Метрики.
- [ ] Реализовать повторные попытки и dead-letter обработку.
- [ ] Для денежных конверсий использовать подтверждённые webhook-данные T-Bank/VK Pay.

## Порядок внедрения

### Этап 1. Инфраструктура

- [x] `metrics.ts`, типы событий, `no-op`, dev logger.
- [x] Инициализация счётчика и политика согласия.
- [x] SPA page views для BrowserRouter и HashRouter.
- [x] Unit-тесты: нет ID, счётчик не загружен, параметры фильтруются, отправка не бросает исключения.

### Этап 2. Основные воронки

- [ ] Клиент: мастер → услуга → дата → время → подтверждение → депозит → успех.
- [ ] Мастер: создание записи → успех; trial/подписка → подтверждённая активация.
- [ ] Цели в интерфейсе Яндекс Метрики создавать с теми же именами событий.

### Этап 3. Retention и полезные функции

- [ ] Возврат клиента к списку записей.
- [ ] Переносы, отмены, календарь и чат.
- [ ] Шеринг мастера и QR.
- [ ] Маршруты одной записи и всего дня.

### Этап 4. Серверные конверсии

- [ ] Outbox/очередь и дедупликация.
- [ ] Оплаты, подписки и жизненный цикл записей.
- [ ] Сверка клиентских и серверных событий без передачи пользовательских ID в Метрику.

### Этап 5. Max-боты и Rasa

- [ ] Server-side analytics adapter и outbox в `../max-bot`.
- [ ] Входящие webhook, admission/dedup и результаты Max Bot API.
- [ ] Клиентская booking-agent воронка.
- [ ] Master canonical runtime: turn, semantic route, Rasa flow и callbacks.
- [ ] Подтверждённые mutation-конверсии и readonly results.
- [ ] Rasa/AI request latency и failure events без содержимого запросов.
- [ ] Уведомления и напоминания по типу и роли бота.
- [ ] CI analytics contract, redaction и idempotency tests.

## Проверка готовности

- [x] События не отправляются до принятия требуемого согласия.
- [x] В development/test нет реальных запросов к Яндекс Метрике.
- [x] Одно действие создаёт одно событие, включая React StrictMode.
- [x] Успешное событие не отправляется при ошибке API.
- [x] Названия событий и ключей стабильны и типизированы.
- [x] Параметры имеют ограниченную кардинальность.
- [x] В payload нет PII, URL с ID, координат и свободного текста.
- [x] AdBlock или недоступность Метрики не ломают приложение.
- [x] Page views корректно работают и в `BrowserRouter`, и в `HashRouter`.
- [ ] События проверены в DebugView/отладчике Метрики на тестовом счётчике.
