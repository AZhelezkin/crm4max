# Серии записей: зафиксированные решения и план реализации

Статус: зафиксировано для реализации.

Дата фиксации: 2026-08-10.

Этот документ является источником истины для первой версии повторяющихся записей. Изменение любого решения ниже сначала вносится в этот файл, затем в код.

## 1. Порядок реализации

Реализация идёт строго в следующем порядке:

1. Исследование существующего booking flow, компонентов MAX UI и SVG-макетов.
2. Согласование недостающих визуальных решений, если для нового экрана нет SVG-макета.
3. Реализация всего frontend на типизированных mock-данных.
4. Unit- и integration-тесты frontend.
5. Изолированный harness всех новых экранов, элементов и состояний.
6. Показ harness пользователю и внесение визуальных/сценарных правок.
7. Явное подтверждение пользователя на переход к backend.
8. Prisma-модели, миграция и backend API.
9. Подключение frontend к реальному API.
10. Сквозные тесты, cron материализации и проверка уведомлений.

Backend не реализуется до принятия frontend-harness.

Frontend серий не включается в production до появления backend и прохождения сквозных тестов.

## 2. Термины

| Термин | Значение |
|---|---|
| Серия | Один пользовательский объект с правилом повторения и общими настройками будущих записей |
| Экземпляр | Обычная `Booking`, созданная серией на конкретные дату и время |
| Правило | Период, интервал недель и набор дней недели с отдельным временем |
| Исключение | Экземпляр, который был отдельно изменён или отдельно отменён |
| Ревизия | Внутренняя версия правила и шаблона серии, действующая с определённого экземпляра |
| Исходное вхождение | Дата и время, на которые экземпляр был сгенерирован правилом до индивидуального переноса |
| Материализация | Создание обычных `Booking` по правилу серии на ограниченный горизонт |

## 3. Продуктовые решения

### D-01. Серия является отдельной сущностью

Серия не является набором несвязанных записей. В базе существует отдельная логическая сущность `BookingSeries`.

Каждое посещение при этом является обычной `Booking` и содержит ссылку на серию. Поэтому с экземпляром работают все существующие механизмы записи: статус, оплата, напоминания, календарь, комментарии и история.

### D-02. Серии создаёт только мастер

В первой версии создание и управление сериями доступно только в master-app.

Клиентское приложение показывает экземпляры серии как обычные записи. Допускается добавить клиенту read-only признак «Повторяющаяся», но клиент не создаёт и не редактирует правило серии.

### D-03. Поддерживаемые правила повторения

В первой версии доступны только:

- каждую неделю;
- раз в две недели;
- от одного до семи выбранных дней недели;
- ровно одно время для каждого выбранного дня;
- обязательная дата начала;
- необязательная дата окончания.

Месячные правила, произвольное число недель и несколько времён в один день в первую версию не входят.

### D-04. Серия без окончания является бессрочной

Пустая дата окончания означает настоящую бессрочную серию, а не фиксированное число повторений.

Frontend показывает первые 12 будущих вхождений в preview. Backend материализует записи на скользящий горизонт 90 дней.

### D-05. Правила расчёта дат

- `startDate` включается в период.
- `endDate` включается в период.
- Дни недели используют ISO: `1=Пн ... 7=Вс`.
- Для интервала в две недели якорной считается ISO-неделя, содержащая `startDate`.
- В якорной неделе создаются только выбранные дни не раньше `startDate`.
- Следующая активная неделя начинается через две недели от якорной.
- Расписание хранится в локальных дате и времени мастера.
- Серия обязательно хранит IANA timezone, например `Europe/Moscow`.
- Формат даты в API: `YYYY-MM-DD`.
- Формат времени в API: `HH:mm`.
- Wheel picker использует шаг 15 минут.

### D-06. Конфликты не блокируют выбор

Мастер может выбрать:

- занятое время;
- время в перерыве;
- время вне рабочего графика.

Такие варианты визуально отмечаются предупреждением, но остаются доступными.

Перед созданием или пакетным изменением frontend показывает итоговое предупреждение и число конфликтов. Backend повторно рассчитывает конфликты непосредственно перед транзакцией.

### D-07. Экземпляры материализуются заранее

Backend создаёт реальные `Booking` на 90 дней вперёд.

При создании серии начальный горизонт считается от более поздней даты из текущей даты и `startDate`. Если серия конечная, материализация останавливается на `endDate`.

Ежедневный serverless cron в 02:00 UTC продлевает бессрочные и длинные конечные серии до горизонта 90 дней.

Cron не отправляет уведомление о создании каждого нового экземпляра.

### D-08. Одиночное изменение создаёт исключение

Действие `SINGLE` меняет только выбранную `Booking`.

После одиночного изменения или одиночной отмены экземпляр получает `isSeriesException=true`.

В первой версии исключение применяется ко всему экземпляру. Маска отдельных переопределённых полей не используется.

Последующие пакетные редактирования серии не перезаписывают исключение автоматически.

### D-09. Серия использует ревизии, а не становится несколькими пользовательскими сериями

Действие «Эта и следующие» не создаёт вторую видимую пользователю серию.

Backend закрывает текущую ревизию перед исходным вхождением выбранной записи и создаёт новую ревизию внутри той же `BookingSeries`.

История остаётся связанной с одним `seriesId`.

### D-10. Области действия

API использует перечисление:

```text
SINGLE
THIS_AND_FUTURE
ALL
```

Семантика:

| Scope | Что меняется |
|---|---|
| `SINGLE` | Только выбранный экземпляр; он становится исключением |
| `THIS_AND_FUTURE` | Выбранное исходное вхождение и все более поздние изменяемые экземпляры |
| `ALL` | Все будущие изменяемые экземпляры активной серии, включая находящиеся раньше выбранной записи |

`ALL` никогда не переписывает историю. В интерфейсе пункт называется «Вся серия», а подпись уточняет: «Все будущие записи; прошедшие не изменятся».

Граница `THIS_AND_FUTURE` определяется исходными датой и временем экземпляра, а не фактическим временем после индивидуального переноса.

### D-11. Выбор scope показывается по действию

Постоянного поля scope на экране записи нет.

Для записи из серии выбор области показывается после нажатия:

- изменить запись;
- перенести запись;
- отменить запись.

После выбора scope экран редактирования всегда показывает заметный контекст действия: «Только эта запись», «Эта и следующие» или «Вся серия».

### D-12. Действия, которые всегда атомарны

Следующие действия всегда относятся к одной `Booking` и не показывают scope-dialog:

- отметить выполненной;
- подтвердить оплату;
- отправить ручное напоминание;
- добавить в календарь;
- открыть маршрут;
- оставить или просмотреть отзыв.

Массово завершать записи или менять факт оплаты нельзя.

### D-13. Защита истории и финансовых фактов

| Состояние экземпляра | Пакетное редактирование | Пакетная отмена |
|---|---|---|
| `COMPLETED` | Не меняется | Не меняется |
| `CANCELLED` | Не меняется | Уже отменён, считается пропущенным |
| `PENDING/CONFIRMED + UNPAID` | Меняется | Отменяется |
| `PENDING/CONFIRMED + DEPOSIT_PAID/PAID` | Дату, время и адрес менять можно; услуги и финансовые поля не меняются | Пакетно не отменяется, требует отдельного действия |
| Будущее исключение | Не перезаписывается редактированием серии | Отменяется вместе с серией, если не оплачено |

Статус оплаты, платежи и уже зафиксированные суммы никогда не изменяются пакетной операцией.

Если серия отменяется, а внутри есть оплаченные будущие записи, backend пропускает их и возвращает `PAYMENT_REQUIRES_MANUAL_ACTION`. Frontend показывает список записей, требующих отдельной обработки.

### D-14. Удаление не используется

Экземпляры и серии не удаляются физически пользовательскими действиями.

Экземпляр получает `CANCELLED`. Серия получает `CANCELLED` либо `ENDED`. Это сохраняет платежи, историю и аудит.

### D-15. Статусы серии

```text
ACTIVE
ENDED
CANCELLED
```

- `ACTIVE`: правило продолжает порождать экземпляры.
- `ENDED`: конечная дата или граница «эта и следующие отменены» пройдена.
- `CANCELLED`: вся серия отменена пользователем.

Пауза серии в первую версию не входит.

### D-16. Уведомления агрегируются

- Создание серии отправляет клиенту одно уведомление с кратким расписанием.
- Одиночное изменение или отмена отправляет обычное уведомление конкретной записи.
- Пакетное изменение или отмена отправляет одно сводное уведомление.
- Материализация cron не отправляет уведомления о создании.
- Напоминания за 1 и 24 часа продолжают отправляться для каждого экземпляра отдельно.
- В той же транзакции, что и изменение серии, создаётся запись transactional outbox.
- Worker отправляет уведомление только после commit и помечает outbox-запись доставленной.
- Ошибка отправки приводит к retry outbox, но не откатывает серию.

### D-17. Новые абонементы временно отключаются отдельно от серий

- В форме создания услуги вариант «Абонемент» виден, но disabled.
- Рядом показывается согласованная SVG-иконка under construction.
- Обычную услугу нельзя превратить в абонемент.
- Существующие абонементы продолжают отображаться и обслуживаться.
- Существующий абонемент нельзя превратить в обычную услугу.
- Backend-модели и API абонементов пока не удаляются.
- Абонемент и повторяющаяся серия являются разными доменными сущностями.

### D-18. Утверждённая композиция новых экранов

Отдельных SVG-макетов recurrence и series в `design/` нет. Пользователь утвердил сборку из существующих визуальных паттернов проекта.

- В форме создания строка «Повторение» располагается после строки времени внутри карточки даты и времени.
- При значении «Несколько» строка «Расписание» располагается сразу после «Повторения».
- Редактор расписания строится в порядке: период, частота, дни недели, отдельное время каждого дня, preview и предупреждения, нижняя CTA.
- На экране записи карточка серии располагается после карточки даты и времени.
- Scope dialog содержит три равноправных варианта и не выбирает ни один заранее.
- Выбор варианта scope является отдельным явным действием пользователя.
- Основной viewport visual harness: `390 × 844`.
- Дополнительно выполняется smoke на более широком viewport без изменения композиции.

### D-19. Онлайн-серии не входят в первую версию

- Шаблон серии не содержит `onlineMeetingLink`, поэтому серия создаётся только для приёма у мастера или выезда к клиенту.
- Frontend явно отклоняет выбор «Онлайн» для настроенной серии и выбор «Несколько» для онлайн-записи; режим не сбрасывается молча.
- Обычные онлайн-записи и онлайн-абонементы продолжают работать без изменений.
- Поддержка онлайн-серий требует отдельного изменения frontend/backend-контракта, ревизий, материализации и уведомлений.

## 4. Целевая модель данных backend

Названия полей ниже являются целевым контрактом. Допускается только техническая адаптация регистра под текущие Prisma-соглашения без изменения семантики.

### BookingSeries

```text
id                 UUID, PK
masterId           UUID, FK
status             ACTIVE | ENDED | CANCELLED
timezone           IANA timezone
startDate          YYYY-MM-DD
endDate            YYYY-MM-DD | null, inclusive
generatedThrough   YYYY-MM-DD | null
version            integer, starts at 1
createdAt           timestamp
updatedAt           timestamp
```

`version` используется для optimistic locking всех пакетных операций.

### BookingSeriesRevision

```text
id                   UUID, PK
seriesId             UUID, FK
effectiveFromDate    YYYY-MM-DD, inclusive
effectiveFromTime    HH:mm, inclusive
effectiveUntilDate   YYYY-MM-DD | null, exclusive boundary
effectiveUntilTime   HH:mm | null, exclusive boundary
intervalWeeks        1 | 2
clientId             UUID | null
masterClientId       UUID | null
clientAddress        string | null
notes                string | null
remind               boolean
color                string | null
totalPrice           integer | null, kopecks
durationMinutes      integer
supersededAtVersion  integer | null
createdAt             timestamp
```

Ровно одно из `clientId` и `masterClientId` обязательно. Это сохраняет поддержку Max-клиентов и клиентов, добавленных мастером вручную.

`supersededAtVersion=null` означает активный участок timeline. Если новая операция `THIS_AND_FUTURE` или `ALL` начинается раньше уже запланированной будущей ревизии, пересекающиеся будущие ревизии не удаляются: они получают `supersededAtVersion` новой версии серии и остаются доступными для аудита, но больше не участвуют в materialization. Ревизия, содержащая новую границу, закрывается на этой границе; новая активная ревизия заменяет timeline от границы операции. Повторная операция от той же записи или от более ранней будущей записи поэтому валидна.

Услуги ревизии хранятся нормализованно в `BookingSeriesRevisionService`, а не в JSON.

### BookingSeriesRevisionService

```text
id             UUID, PK
revisionId     UUID, FK
serviceId      UUID, FK
price          integer | null, kopecks
order          integer
```

Первая услуга по `order` является первичной и заполняет существующее поле `Booking.service` для совместимости текущих read-моделей.

### BookingSeriesSlot

```text
id             UUID, PK
revisionId     UUID, FK
dayOfWeek      integer, 1..7 ISO
time           HH:mm
```

В одной ревизии допускается не более одного слота на день недели.

### Дополнительные поля Booking

```text
seriesId                 UUID | null, FK
seriesRevisionId         UUID | null, FK
seriesSlotId             UUID | null, FK
seriesOccurrenceKey      string | null
seriesOriginalDate       YYYY-MM-DD | null
seriesOriginalTime       HH:mm | null
isSeriesException        boolean, default false
seriesCancellationReason USER | SERIES_CHANGED | SERIES_CANCELLED | null
```

Уникальный индекс:

```text
unique(seriesId, seriesOccurrenceKey)
```

`seriesOccurrenceKey` детерминированно строится из `revisionId`, `seriesSlotId` и локальной даты. Повторный запуск materializer не создаёт дубль.

### BookingSeriesChange

```text
id                 UUID, PK
seriesId           UUID, FK
actorMasterId      UUID | null, FK
scope              SINGLE | THIS_AND_FUTURE | ALL | null
anchorBookingId    UUID | null
operation          CREATE | UPDATE | CANCEL | MATERIALIZE
before             JSON | null
after              JSON | null
result              JSON
createdAt           timestamp
```

Журнал обязателен для пакетных операций и диагностики. Для `CREATE` и `MATERIALIZE` поле `scope` равно `null`. Для `MATERIALIZE` поле `actorMasterId` равно `null`. Undo в первой версии не реализуется.

## 5. Frontend-модели

```ts
type SeriesActionScope = 'SINGLE' | 'THIS_AND_FUTURE' | 'ALL'

interface RecurrenceSlot {
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7
  time: string
}

interface RecurrenceRule {
  startDate: string
  endDate: string | null
  intervalWeeks: 1 | 2
  timezone: string
  slots: RecurrenceSlot[]
}

interface BookingSeriesTemplate {
  clientId: string | null
  masterClientId: string | null
  services: { serviceId: string; price: number | null }[]
  totalPrice: number | null
  durationMinutes: number
  clientAddress: string | null
  notes: string | null
  remind: boolean
  color: string | null
}

interface SeriesOccurrencePreview {
  date: string
  time: string
  warnings: SeriesWarning[]
}

type SeriesWarningType =
  | 'BOOKING_OVERLAP'
  | 'OUTSIDE_WORKING_HOURS'
  | 'BREAK_OVERLAP'
  | 'PAYMENT_REQUIRES_MANUAL_ACTION'
```

Frontend использует один тип правила для mock-gateway и реального API. После подключения backend форма и компоненты не переписываются, меняется только adapter.

## 6. Backend REST API

### 6.1. Общие правила

- Все новые маршруты доступны только авторизованному мастеру.
- Мастер может читать и менять только собственные серии и записи.
- `masterId` из payload обязан совпадать с master из JWT.
- Цены передаются в копейках.
- Даты и время передаются локальными строками вместе с IANA timezone серии.
- Batch mutation выполняется одной Prisma-транзакцией.
- Уведомления отправляются после commit.
- Конфликты расписания являются предупреждениями, а не безусловным запретом.
- `Idempotency-Key` обязателен для создания серии.
- `expectedVersion` обязателен для изменения и отмены серии.

### 6.2. Preview серии

```http
POST /api/booking-series/preview
```

Request:

```json
{
  "masterId": "uuid",
  "template": {
    "clientId": "uuid-or-null",
    "masterClientId": "uuid-or-null",
    "services": [
      { "serviceId": "uuid", "price": null }
    ],
    "totalPrice": null,
    "durationMinutes": 90,
    "clientAddress": null,
    "notes": null,
    "remind": true,
    "color": null
  },
  "rule": {
    "startDate": "2026-08-17",
    "endDate": null,
    "intervalWeeks": 1,
    "timezone": "Europe/Moscow",
    "slots": [
      { "dayOfWeek": 1, "time": "14:00" },
      { "dayOfWeek": 3, "time": "16:30" }
    ]
  }
}
```

Response `200`:

```json
{
  "occurrences": [
    {
      "date": "2026-08-17",
      "time": "14:00",
      "warnings": []
    },
    {
      "date": "2026-08-19",
      "time": "16:30",
      "warnings": [
        {
          "type": "BOOKING_OVERLAP",
          "message": "Время пересекается с другой записью"
        }
      ]
    }
  ],
  "previewLimit": 12,
  "estimatedTotalOccurrences": null,
  "materializationOccurrences": 26,
  "warningsCount": 1
}
```

`estimatedTotalOccurrences` равен `null` для бессрочной серии.

Preview ничего не записывает в базу.

### 6.3. Создание серии

```http
POST /api/booking-series
Idempotency-Key: <uuid>
```

Payload совпадает с preview и дополнительно содержит:

```json
{
  "allowConflicts": true
}
```

Если backend обнаружил предупреждения, а `allowConflicts=false`, он возвращает `409 SERIES_CONFLICTS` и актуальный preview. После явного подтверждения frontend повторяет запрос с тем же `Idempotency-Key` и `allowConflicts=true`.

Точная форма `409 SERIES_CONFLICTS` использует единый error envelope; authoritative preview находится только в `error.details.preview`:

```json
{
  "error": {
    "code": "SERIES_CONFLICTS",
    "message": "В расписании есть предупреждения",
    "details": {
      "preview": {
        "occurrences": [],
        "previewLimit": 12,
        "estimatedTotalOccurrences": null,
        "materializationOccurrences": 26,
        "warningsCount": 1
      }
    }
  }
}
```

Frontend не читает альтернативное поле `preview` на верхнем уровне ответа.

Response `201`:

```json
{
  "series": {
    "id": "uuid",
    "status": "ACTIVE",
    "version": 1,
    "timezone": "Europe/Moscow",
    "startDate": "2026-08-17",
    "endDate": null,
    "rule": {
      "intervalWeeks": 1,
      "slots": [
        { "dayOfWeek": 1, "time": "14:00" },
        { "dayOfWeek": 3, "time": "16:30" }
      ]
    }
  },
  "firstBookingId": "uuid",
  "materializedCount": 26,
  "warnings": []
}
```

Повтор успешно выполненного запроса с тем же `Idempotency-Key` возвращает тот же результат и не создаёт вторую серию.

Ответ `409 SERIES_CONFLICTS` не резервирует `Idempotency-Key`, потому что серия ещё не создана. Поэтому frontend повторяет запрос с тем же ключом и `allowConflicts=true`. После успешного создания ключ связывается с canonical payload без технического поля `allowConflicts`.

### 6.4. Получение серии

```http
GET /api/booking-series/:seriesId?cursor=<bookingId>&limit=30
```

Response `200`:

```json
{
  "series": {
    "id": "uuid",
    "status": "ACTIVE",
    "version": 3,
    "timezone": "Europe/Moscow",
    "startDate": "2026-08-17",
    "endDate": null,
    "rule": {
      "intervalWeeks": 1,
      "slots": [
        { "dayOfWeek": 1, "time": "14:00" }
      ]
    },
    "template": {
      "client": {
        "id": "uuid",
        "name": "Ирина Клиентова",
        "phone": "+79990000002",
        "photo": null,
        "isMaxUser": true
      },
      "services": [
        {
          "service": {
            "id": "uuid",
            "name": "Стрижка",
            "duration": 90,
            "price": 250000,
            "discountPercent": null,
            "photo": null
          },
          "price": null,
          "order": 0
        }
      ],
      "totalPrice": null,
      "durationMinutes": 90,
      "clientAddress": null,
      "notes": null,
      "remind": true,
      "color": null
    },
    "exceptionsCount": 1,
    "manualActionCount": 1,
    "manualActionBookings": [
      {
        "bookingId": "uuid",
        "date": "2026-09-07",
        "time": "14:00",
        "paymentStatus": "DEPOSIT_PAID",
        "reason": "PAYMENT_REQUIRES_MANUAL_ACTION"
      }
    ],
    "nextOccurrence": {
      "bookingId": "uuid",
      "date": "2026-08-17",
      "time": "14:00"
    }
  },
  "bookings": [],
  "nextCursor": null
}
```

Read-response содержит готовые проекции клиента и услуг. Экран серии не выполняет дополнительные запросы для разрешения ID. `manualActionBookings` не зависит от pagination общего списка экземпляров и всегда содержит все будущие записи, требующие отдельной обработки.

### 6.5. Изменение одной записи

```http
PATCH /api/bookings/:bookingId
```

Request:

```json
{
  "scope": "SINGLE",
  "changes": {
    "clientAddress": "Новый адрес",
    "notes": "Комментарий",
    "remind": false,
    "color": null,
    "services": [
      { "serviceId": "uuid", "price": null }
    ],
    "totalPrice": null
  }
}
```

Для записи серии endpoint принимает только `scope=SINGLE`. Серийные scopes отправляются в endpoint серии.

Response `200` возвращает обновлённую `Booking` с `isSeriesException=true`.

### 6.6. Одиночный перенос

Существующий endpoint сохраняется:

```http
POST /api/bookings/:bookingId/reschedule
```

Request:

```json
{
  "date": "2026-08-20",
  "time": "15:00",
  "allowOverlap": true
}
```

Для экземпляра серии этот endpoint всегда выполняет `SINGLE` и делает запись исключением.

Перенос `THIS_AND_FUTURE` или `ALL` открывает редактор правила и использует `PATCH /api/booking-series/:seriesId`.

### 6.7. Пакетное изменение серии

```http
PATCH /api/booking-series/:seriesId
```

Request:

```json
{
  "expectedVersion": 3,
  "scope": "THIS_AND_FUTURE",
  "anchorBookingId": "uuid",
  "allowConflicts": true,
  "changes": {
    "template": {
      "clientAddress": "Новый адрес",
      "remind": true
    },
    "rule": {
      "startDate": "2026-08-17",
      "endDate": null,
      "intervalWeeks": 2,
      "timezone": "Europe/Moscow",
      "slots": [
        { "dayOfWeek": 2, "time": "15:00" }
      ]
    }
  }
}
```

Правила:

- Для `THIS_AND_FUTURE` поле `anchorBookingId` обязательно.
- Для `ALL` поле `anchorBookingId` необязательно и не задаёт границу.
- `SINGLE` этим endpoint не принимается.
- Пустые `template` и `rule` запрещены.
- Backend создаёт новую ревизию и не изменяет историческую ревизию на месте.
- Исключения сохраняются и возвращаются в `skipped`.

Response `200`:

```json
{
  "series": {
    "id": "uuid",
    "status": "ACTIVE",
    "version": 4
  },
  "result": {
    "updated": 10,
    "created": 3,
    "superseded": 2,
    "skipped": [
      {
        "bookingId": "uuid",
        "reason": "LOCAL_EXCEPTION"
      }
    ],
    "warnings": []
  }
}
```

### 6.8. Preview пакетного изменения или отмены

```http
POST /api/booking-series/:seriesId/preview-change
```

Request для изменения повторяет payload `PATCH /api/booking-series/:seriesId` и добавляет `"operation": "UPDATE"`.

Request для отмены:

```json
{
  "expectedVersion": 4,
  "operation": "CANCEL",
  "scope": "THIS_AND_FUTURE",
  "anchorBookingId": "uuid"
}
```

Response `200`:

```json
{
  "seriesId": "uuid",
  "version": 4,
  "result": {
    "updated": 8,
    "created": 2,
    "superseded": 1,
    "cancelled": 0,
    "skipped": [
      {
        "bookingId": "uuid",
        "reason": "LOCAL_EXCEPTION"
      }
    ],
    "warnings": []
  }
}
```

Preview authoritative, повторно выполняет проверки статусов, оплат и конфликтов, но ничего не записывает. Frontend не вычисляет batch counts самостоятельно.

### 6.9. Отмена записи или серии

Существующий endpoint расширяется необязательным body:

```http
POST /api/bookings/:bookingId/cancel
```

Request:

```json
{
  "scope": "THIS_AND_FUTURE",
  "expectedSeriesVersion": 4
}
```

Если body отсутствует, поведение остаётся `SINGLE`. Это необходимо для текущих клиентов API.

Семантика:

- `SINGLE`: отменяется одна запись, она становится исключением.
- `THIS_AND_FUTURE`: серия останавливается перед исходным вхождением anchor; отменяются изменяемые экземпляры от anchor.
- `ALL`: серия получает `CANCELLED`; отменяются все будущие изменяемые экземпляры.

Response `200`:

```json
{
  "series": {
    "id": "uuid",
    "status": "ACTIVE",
    "version": 5
  },
  "result": {
    "cancelled": 8,
    "skipped": [
      {
        "bookingId": "uuid",
        "reason": "PAYMENT_REQUIRES_MANUAL_ACTION"
      }
    ]
  }
}
```

Для обычной записи и `scope=SINGLE` endpoint сохраняет текущий response: одну `Booking`. Для серийного batch scope возвращается batch-response выше.

После `THIS_AND_FUTURE` серия остаётся `ACTIVE`, если до границы есть будущие неотменённые экземпляры. Если таких экземпляров нет, она сразу получает `ENDED`. После прохождения последнего оставшегося экземпляра конечная серия переводится в `ENDED` materializer-ом.

### 6.10. Read-модель Booking

`GET /api/bookings`, `GET /api/bookings/:id` и mutation responses добавляют nullable поле:

```json
{
  "series": {
    "id": "uuid",
    "status": "ACTIVE",
    "version": 4,
    "isException": false,
    "originalDate": "2026-08-17",
    "originalTime": "14:00",
    "summary": "Каждую неделю · Пн 14:00, Ср 16:30"
  }
}
```

Для обычной записи `series=null`.

### 6.11. Materializer cron

```http
POST /api/booking-series/materialize
x-cron-secret: <secret>
```

Request body отсутствует.

Endpoint проверяет отдельный `BOOKING_SERIES_MATERIALIZER_CRON_SECRET`; общий `CRON_SECRET` подписок, напоминаний и диагностики не используется. Cloud Function получает этот секрет из Lockbox через выделенный execution service account и не сохраняет значение в обычных environment-переменных версии или аргументах deploy-команды.

Response `200`:

```json
{
  "processedSeries": 12,
  "createdBookings": 34,
  "failedSeries": 0
}
```

Одна проблемная серия не откатывает успешно материализованные серии. Каждая серия обрабатывается отдельной транзакцией и блокировкой.

## 7. Ошибки API

Единый формат новых ошибок:

```json
{
  "error": {
    "code": "SERIES_VERSION_CONFLICT",
    "message": "Серия уже была изменена",
    "details": {
      "actualVersion": 5
    }
  }
}
```

| HTTP | Code | Условие |
|---|---|---|
| 400 | `INVALID_RECURRENCE_RULE` | Невалидные даты, время, interval или slots |
| 400 | `INVALID_SERIES_SCOPE` | Scope не подходит endpoint или отсутствует anchor |
| 400 | `INVALID_SERIES_TEMPLATE` | Не задан клиент, услуги или нарушена цена |
| 401 | `UNAUTHORIZED` | Нет валидного JWT |
| 403 | `SERIES_ACCESS_DENIED` | Серия принадлежит другому мастеру |
| 404 | `SERIES_NOT_FOUND` | Серия не найдена |
| 404 | `BOOKING_NOT_FOUND` | Anchor или экземпляр не найден |
| 409 | `SERIES_CONFLICTS` | Есть предупреждения, но `allowConflicts=false` |
| 409 | `SERIES_VERSION_CONFLICT` | `expectedVersion` устарел |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Ключ повторно использован с другим payload |
| 422 | `SERIES_NOT_ACTIVE` | Попытка изменить завершённую или отменённую серию |
| 422 | `BOOKING_IMMUTABLE` | Попытка изменить завершённую запись |

Frontend при `SERIES_VERSION_CONFLICT` перечитывает серию и предлагает повторить действие, но не применяет изменения автоматически.

## 8. Транзакционные инварианты backend

- Создание серии, первой ревизии, slots, services и materialized bookings выполняется одной транзакцией.
- Пакетное изменение блокирует `BookingSeries` и проверяет `expectedVersion` внутри транзакции.
- Версия увеличивается ровно один раз на успешную пользовательскую batch mutation.
- Materializer использует idempotent occurrence key и не создаёт дубль при retry.
- Старые ревизии не удаляются и остаются доступными для аудита; технические границы активного timeline и `supersededAtVersion` могут фиксироваться следующей batch mutation.
- Удалённые новым правилом будущие экземпляры не удаляются физически, а получают `CANCELLED` и `SERIES_CHANGED`.
- Отменённый одиночный экземпляр не воскрешается materializer.
- Локально перенесённое исключение не возвращается на исходное время после изменения серии.
- Notification outbox создаётся внутри основной транзакции; внешние уведомления и метрики не отправляются до commit.
- Ошибка уведомления не откатывает уже сохранённую серию и обрабатывается retry worker-а.

## 9. Зафиксированный UX создания серии

### Экран создания записи

- По умолчанию `Повторение = Разовая`.
- Выбор содержит только `Разовая` и `Несколько`.
- При выборе `Несколько` открывается отдельный экран настройки расписания.
- После сохранения настройки на форме показывается строка `Расписание` и краткое описание правила.
- Дата начала по умолчанию равна уже выбранной дате записи.
- Выбранный день недели по умолчанию соответствует дате начала.
- Время выбранного дня по умолчанию равно уже выбранному времени записи.
- Если дата или время ещё не выбраны, соответствующее значение обязательно заполняется в редакторе расписания.

### Экран расписания

- Дата начала обязательна.
- Дата окончания необязательна и подписана как «Без даты окончания».
- Периодичность: «Каждую неделю» или «Раз в две недели».
- Дни недели выбираются независимо.
- Для каждого выбранного дня показывается отдельная строка времени.
- Нажатие времени открывает существующий wheel picker.
- Занятые и внерабочие интервалы отмечаются, но доступны.
- Сохранение недоступно без выбранного дня и времени для каждого выбранного дня.
- Перед возвратом в создание записи показывается preview первых вхождений и суммарные предупреждения.

### Подтверждение создания

- Для конечной серии показывается рассчитанное общее число вхождений.
- Для бессрочной серии показывается текст «Без даты окончания» и первые 12 вхождений.
- При конфликтах показывается отдельное подтверждение «Создать всё равно».
- После успеха показывается число материализованных записей и ссылка на серию.

## 10. Зафиксированный UX управления

### BookingDetailPage

Для экземпляра серии добавляются:

- бейдж «Повторяющаяся»;
- краткое правило;
- признак «Изменена отдельно», если это исключение;
- действие «Открыть серию».

### Scope dialog

Для изменения, переноса и отмены:

```text
Только эта запись
Эта и следующие
Вся серия
```

У каждого пункта есть короткое пояснение последствий.

Ни один пункт не выбран по умолчанию.

### Экран серии

Показывает:

- статус серии;
- клиента;
- услуги и текущую стоимость шаблона;
- правило расписания;
- дату начала и дату окончания;
- ближайшие экземпляры;
- исключения;
- оплаченные записи, требующие отдельной обработки;
- действия «Изменить серию», «Завершить с этой записи», «Отменить серию».

### Редактирование

- `SINGLE` открывает редактор обычной записи без recurrence-полей.
- `THIS_AND_FUTURE` открывает шаблон и правило новой ревизии с anchor-контекстом.
- `ALL` открывает шаблон и правило для всех будущих записей.
- Перед batch submit показывается количество обновляемых, создаваемых, отменяемых и пропускаемых экземпляров.
- После batch submit показывается фактический отчёт backend.

## 11. Frontend-first архитектура

- UI работает через типизированный `bookingSeriesGateway`.
- Production adapter обращается к REST API из раздела 6.
- Mock adapter импортируется только тестами и screen-harness.
- Production bundle не содержит автоматического fallback на mock.
- После подключения backend временный feature flag удалён; production runtime всегда использует REST adapter.
- Harness включает feature независимо от production-флага.
- После сквозной интеграции временный feature flag удаляется, а не остаётся как постоянная compatibility-ветка.
- Генератор preview дат является чистой frontend-функцией для мгновенной отрисовки.
- Backend preview остаётся источником истины для конфликтов и окончательного количества.

Все стили пишутся inline и используют только существующие CSS tokens и `text.*` typography styles.

До записи числовых значений стилей извлекаются координаты, размеры, цвета и SVG paths из `design/`. Если отдельного SVG нового экрана нет, сначала собирается карта блоков из существующих утверждённых компонентов и согласуется с пользователем. Новая визуальная система не придумывается.

## 12. Обязательная матрица harness

| ID | Состояние |
|---|---|
| H-01 | Создание обычной записи, `Повторение = Разовая` |
| H-02 | Открытый dropdown повторения |
| H-03 | Создание записи с уже настроенной серией |
| H-04 | Пустой редактор расписания с validation |
| H-05 | Конечная еженедельная серия с несколькими днями |
| H-06 | Бессрочная серия раз в две недели |
| H-07 | Wheel picker со свободным временем |
| H-08 | Wheel picker с занятым временем |
| H-09 | Wheel picker со временем вне графика и в перерыве |
| H-10 | Preview серии без конфликтов |
| H-11 | Preview серии с несколькими типами конфликтов |
| H-12 | Подтверждение «Создать всё равно» |
| H-13 | BookingDetail обычной записи |
| H-14 | BookingDetail экземпляра серии |
| H-15 | BookingDetail индивидуального исключения |
| H-16 | Scope dialog для изменения или переноса; harness содержит оба варианта |
| H-17 | Scope dialog для отмены |
| H-18 | Редактирование `SINGLE` |
| H-19 | Редактирование `THIS_AND_FUTURE` |
| H-20 | Редактирование `ALL` |
| H-21 | Активная серия со списком будущих записей |
| H-22 | Серия с исключениями |
| H-23 | Серия с оплаченной записью, требующей отдельного действия |
| H-24 | Завершённая серия |
| H-25 | Отменённая серия |
| H-26 | Batch preview с updated/created/skipped |
| H-27 | Успешный batch result |
| H-28 | Ошибка version conflict |
| H-29 | Disabled-вариант создания абонемента |
| H-30 | Редактирование существующего абонемента без смены типа |

Каждое новое состояние проверяется в dark и light theme. Основной viewport новых экранов серий: `390 × 844`. Дополнительно проводится smoke на более широком viewport без изменения продуктовой композиции.

Harness-файлы не включаются в production-коммит.

## 13. Тестовый чеклист frontend

- [ ] Генерация еженедельных дат.
- [ ] Генерация дат раз в две недели от anchor-недели.
- [ ] Включённые границы startDate и endDate.
- [ ] Выбранный weekday раньше startDate переносится на следующую активную неделю.
- [ ] Сортировка нескольких weekdays и времён.
- [ ] Отсутствие дублей.
- [ ] Бессрочный preview ограничен 12 вхождениями.
- [ ] Невалидная дата окончания блокирует сохранение.
- [ ] Отсутствующий weekday блокирует сохранение.
- [ ] Отсутствующее время выбранного дня блокирует сохранение.
- [ ] Занятый слот остаётся выбираемым.
- [ ] Внерабочий слот остаётся выбираемым.
- [ ] Конфликт требует отдельного подтверждения.
- [ ] Обычная запись не показывает series UI.
- [ ] Экземпляр серии показывает summary и ссылку.
- [ ] Исключение показывает отдельный признак.
- [ ] Scope dialog появляется только у серийной записи.
- [ ] Payment/complete/remind не показывают scope dialog.
- [ ] `SINGLE` не меняет mock-серию и помечает экземпляр исключением.
- [ ] `THIS_AND_FUTURE` не меняет экземпляры до anchor.
- [ ] `ALL` не меняет прошедшие и завершённые экземпляры.
- [ ] Оплаченные экземпляры корректно попадают в skipped.
- [ ] Version conflict не затирает пользовательский draft.
- [ ] Scope dialog не имеет предварительно выбранного варианта.
- [ ] Batch preview получает counts и skipped только из gateway.
- [ ] Series detail получает read-ready клиента и услуги без дополнительных запросов.
- [ ] Все состояния H-01..H-30 открываются в harness без runtime errors.
- [ ] Typecheck master-app проходит.
- [ ] Production build master-app проходит при выключенном feature flag.

## 14. Тестовый чеклист backend

- [ ] Prisma migration применяется на пустую базу.
- [ ] Prisma migration применяется на базе с существующими Booking и BookingPackage.
- [ ] Существующие записи получают nullable series fields без изменения поведения.
- [ ] Создание серии атомарно.
- [ ] Idempotency-Key не допускает повторного создания.
- [ ] Один Idempotency-Key с другим payload возвращает conflict.
- [ ] Preview не пишет данные.
- [ ] Materializer создаёт только недостающие экземпляры.
- [ ] Retry materializer не создаёт дубли.
- [ ] Конечная серия не создаёт записи после endDate.
- [ ] Отменённая серия больше не материализуется.
- [ ] `SINGLE` создаёт исключение.
- [ ] `THIS_AND_FUTURE` создаёт новую ревизию от исходного anchor.
- [ ] `ALL` меняет только будущие изменяемые экземпляры.
- [ ] Завершённые и отменённые записи не переписываются.
- [ ] Series edit не перезаписывает исключения.
- [ ] Series cancel отменяет неоплаченные будущие исключения.
- [ ] Batch cancel пропускает оплаченные записи.
- [ ] Изменение услуг пропускает оплаченные записи.
- [ ] Изменение даты/времени сохраняет payment facts.
- [ ] Optimistic lock возвращает `SERIES_VERSION_CONFLICT`.
- [ ] Серия другого мастера недоступна.
- [ ] Конфликт расписания возвращает preview при `allowConflicts=false`.
- [ ] `allowConflicts=true` разрешает транзакцию.
- [ ] Создание серии отправляет одно сводное уведомление.
- [ ] Batch mutation отправляет одно сводное уведомление.
- [ ] Materializer не отправляет creation notification.
- [ ] Напоминания продолжают работать для экземпляров.
- [ ] Ошибка уведомления не откатывает commit.
- [ ] Audit log содержит scope, anchor и результат.
- [ ] Существующие `/bookings`, `/reschedule`, `/cancel`, package flow не регрессируют.

## 15. План работ с контрольными воротами

### Gate A. Исследование

- [x] Найти все SVG-макеты, относящиеся к созданию и просмотру записи.
- [x] Извлечь координаты, размеры, цвета и paths используемых элементов.
- [x] Найти существующие dropdown, wheel picker, calendar, warning и confirm patterns.
- [x] Зафиксировать текущий draft lifecycle CreateBookingPage.
- [x] Зафиксировать текущий BookingDetail edit/cancel lifecycle.
- [x] Сопоставить текущие frontend Booking types с контрактом раздела 6.
- [x] Если нового SVG нет, согласовать карту блоков до вёрстки.

Результат Gate A: карта переиспользуемых компонентов и перечень только действительно новых компонентов.

### Gate B. Frontend contracts и mocks

- [x] Добавить типы rule, series, occurrence, warning и scope.
- [x] Добавить чистый генератор occurrence preview.
- [x] Добавить production API adapter по разделу 6.
- [x] Добавить отдельный mock adapter для tests/harness.
- [x] Добавить fixtures для H-01..H-30.
- [x] Добавить временный feature flag, выключенный по умолчанию.

Результат Gate B: UI можно разрабатывать без backend, а transport contract больше не меняется без обновления этого документа.

### Gate C. Frontend создания

- [x] Отключить создание новых абонементов.
- [x] Добавить поле повторения.
- [x] Добавить отдельный редактор расписания.
- [x] Переиспользовать calendar и wheel picker.
- [x] Добавить визуальные warning states.
- [x] Добавить preview и подтверждение конфликтов.
- [x] Добавить summary серии в основной форме.
- [x] Добавить success state со ссылкой на серию.

### Gate D. Frontend управления

- [x] Добавить series summary в BookingDetailPage.
- [x] Добавить scope dialog.
- [x] Реализовать mock-flow `SINGLE`.
- [x] Реализовать mock-flow `THIS_AND_FUTURE`.
- [x] Реализовать mock-flow `ALL`.
- [x] Добавить экран серии.
- [x] Добавить batch preview.
- [x] Добавить batch result и skipped reasons.
- [x] Добавить version conflict state.

### Gate E. Harness и приёмка frontend

- [x] Запустить frontend typecheck.
- [x] Запустить frontend build.
- [ ] Запустить unit/integration tests.
- [x] Отрисовать H-01..H-30.
- [x] Проверить dark/light.
- [x] Проверить mobile/desktop smoke.
- [ ] Показать пользователю полный harness.
- [ ] Внести правки.
- [ ] Получить явное подтверждение перехода к backend.

### Gate F. Backend

- [x] Добавить Prisma models и enums.
- [x] Добавить миграцию.
- [x] Добавить recurrence generator на backend.
- [x] Добавить preview endpoint.
- [x] Добавить create endpoint с idempotency.
- [x] Добавить series read endpoint.
- [x] Добавить single update endpoint.
- [x] Добавить series patch endpoint с revisions.
- [x] Расширить cancel endpoint scope-контрактом.
- [x] Добавить optimistic locking.
- [x] Добавить audit log.
- [x] Добавить aggregate notifications.
- [x] Добавить materializer endpoint.
- [x] Добавить serverless function и daily trigger.
- [x] Покрыть backend checklist тестами.

### Gate G. Интеграция

- [x] Подключить production adapter к backend.
- [x] Удалить mock из runtime path.
- [x] Проверить create finite series.
- [x] Проверить create indefinite series.
- [x] Проверить single exception.
- [x] Проверить this-and-future revision.
- [x] Проверить all-future update.
- [x] Проверить batch cancel с paid skip.
- [x] Проверить reminders.
- [x] Проверить aggregate notifications.
- [x] Проверить materializer retry.
- [x] Удалить временный feature flag.
- [x] Выполнить production migration rehearsal.
- [x] Подготовить rollout и rollback инструкции.

## 16. Не входит в первую версию

- Создание серии клиентом.
- Ежемесячные и годовые правила.
- Произвольный интервал больше двух недель.
- Несколько времён в один день недели.
- Пауза и возобновление серии.
- Массовое завершение записей.
- Массовое изменение статуса оплаты.
- Автоматические возвраты денег.
- Полноценный undo пакетной операции.
- Field-level override mask.
- Физическое удаление серии или экземпляров.
- Объединение абонементов и повторяющихся серий в одну сущность.
