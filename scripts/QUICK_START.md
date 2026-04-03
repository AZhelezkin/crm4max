# ⚡ Quick Start — Загрузка изображений (5 минут)

## 🎯 Цель
Загрузить все изображения из `design/client/` в S3 хранилище для каталога услуг.

---

## 🚀 Шаг 1: Запустите Backend

### Вариант A: На локальной машине

```bash
cd backend
npm install        # если не установлены зависимости
npm run dev        # запустить сервер на http://localhost:3000
```

### Вариант B: В Docker (рекомендуется)

```bash
docker-compose up -d       # запустить backend + PostgreSQL + MinIO
```

Проверьте, что backend работает:
```bash
curl http://localhost:3000/api/auth/vk
```

---

## ⚡ Шаг 2: Загрузите изображения

### Windows (PowerShell)

```powershell
cd scripts
./upload.bat
```

**Готово!** Скрипт автоматически:
- ✅ Получит JWT токен
- ✅ Загрузит все изображения
- ✅ Сохранит результаты в `results/upload-results-{timestamp}.json`

### macOS / Linux

```bash
cd scripts
bash upload.sh
```

---

## 📋 Что произойдет

1. ✅ Скрипт обнаружит **19 изображений** в `design/client/`
2. ✅ Загрузит их в S3 (локально в MinIO)
3. ✅ Вернет публичные URL для каждого
4. ✅ Сохранит результаты в JSON файл

### Результат 📄

File: `scripts/results/upload-results-{timestamp}.json`

```json
{
  "timestamp": "2026-04-01T10:30:00.000Z",
  "total": 19,
  "results": [
    {
      "fileName": "Services.png",
      "url": "http://localhost:9000/crm4max-media/services/a1b2c3d4-e5f6.png",
      "folder": "services"
    },
    // ... еще 18 файлов
  ]
}
```

---

## 🔗 Как использовать URL

### Создать услугу через API

```bash
curl -X POST http://localhost:3000/api/services \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Стрижка",
    "price": 50000,
    "duration": 30,
    "photo": "http://localhost:9000/crm4max-media/services/a1b2c3d4-e5f6.png"
  }'
```

### В TypeScript коде

```typescript
import servicePhotos from '../results/upload-results-latest.json';

const services = [
  {
    name: 'Стрижка',
    photo: servicePhotos.results[0].url,
    price: 50000,
  },
  // ...
];
```

---

## ❓ Часто задаваемые вопросы

### Q: Получаю ошибку "Backend недоступен"
**A:** Убедитесь, что запустили `npm run dev` в папке `backend/`

### Q: "401 Unauthorized"
**A:** JWT токен истек. Перезапустите скрипт и получите новый.

### Q: Какой размер файла поддерживается?
**A:** До 10 МБ. Оптимизируйте PNG/JPG если больше.

### Q: Куда сохранились файлы?
**A:** В S3 по пути: `http://localhost:9000/crm4max-media/services/{uuid}.{ext}`

### Q: Как использовать AWS S3 вместо MinIO?
**A:** Обновите `.env` в backend:
```
S3_REGION=us-east-1
S3_BUCKET=crm4max-media
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=...
S3_ENDPOINT=      # оставьте пустым для AWS
```

---

## 📂 Структура files

```
crm4max/
├── design/client/           ← Исходные изображения (19 шт)
├── scripts/
│   ├── upload.bat          ← Для Windows
│   ├── upload.sh           ← Для Mac/Linux
│   ├── upload-service-images.ts
│   ├── get-jwt-token.ts
│   ├── README.md
│   └── results/            ← JSON с результатами
│       └── upload-results-{timestamp}.json
└── backend/
    ├── src/modules/upload/
    └── .env                ← Configuration
```

---

## ✨ Дополнительно

- 📸 [Полная инструкция](./README.md)
- 🔧 [API документация](../ARCHITECTURE.md)
- 🐳 [Docker setup](../docker-compose.yml)

---

**Вопросы?** Проверьте логи в терминале или отредактируйте `scripts/upload-service-images.ts`.
