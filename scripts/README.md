# 📸 Загрузка изображений услуг

Этот скрипт загружает изображения из папки `design/client/` в S3 хранилище через API.

## 🚀 Быстрый старт

### 1️⃣ Убедитесь, что backend запущен

```bash
cd backend
npm run dev
# Backend должен слушать на http://localhost:3000
```

### 2️⃣ Получите JWT токен

#### Вариант A: Используя cURL

```bash
curl -X POST http://localhost:3000/api/auth/vk \
  -H "Content-Type: application/json" \
  -d '{"token": "eJydUk1PwzAM..."}' # замените на реальный VK Silent Auth токен
```

Ответ:
```json
{"token": "eyJhbGciOiJIUzI1NiIs...", "userId": "xxx"}
```

#### Вариант B: Используя postman/insomnia

- **URL:** `POST http://localhost:3000/api/auth/vk`
- **Body (JSON):** `{"token": "<ваш_vk_silent_auth_token>"}`
- Скопируйте значение поля `token` из ответа

### 3️⃣ Запустите скрипт загрузки

#### На Windows (PowerShell)

```powershell
cd scripts
tsx upload-service-images.ts "eyJhbGciOiJIUzI1NiIs..."
```

#### На macOS / Linux

```bash
cd scripts
tsx upload-service-images.ts "eyJhbGciOiJIUzI1NiIs..."
```

### 4️⃣ Проверьте результаты

Скрипт создаст файл `results/upload-results-{timestamp}.json` с загруженными URL:

```json
{
  "timestamp": "2026-04-01T10:30:00.000Z",
  "total": 19,
  "results": [
    {
      "fileName": "Services.png",
      "url": "http://localhost:9000/crm4max-media/services/a1b2c3d4-e5f6.png",
      "folder": "services"
    }
  ]
}
```

## ⚙️ Конфигурация

Скрипт использует переменные окружения:

```bash
# Переопределить API URL (по умолчанию http://localhost:3000/api)
export API_URL="http://your-api.com/api"
tsx upload-service-images.ts "YOUR_JWT_TOKEN"
```

## 🔧 Docker вариант (рекомендуется для S3)

Если используете MinIO через docker-compose:

```bash
# Запустить backend + MinIO
docker-compose up -d

# Затем запустить скрипт (код автоматически подключится к localhost MinIO)
tsx upload-service-images.ts "JWT_TOKEN"
```

## 📁 Структура хранилища

После загрузки файлы будут в S3 по пути:
```
crm4max-media/
└── services/
    ├── a1b2c3d4-e5f6.png
    ├── b2c3d4e5-f6g7.jpg
    └── ...
```

## 🐛 Решение проблем

### ❌ "Директория не найдена"
- Убедитесь, что запускаете скрипт из папки `scripts/` в корне проекта
- Проверьте путь к `design/client/`

### ❌ "401 Unauthorized"
- JWT токен истек или неверный
- Получите новый токен через API `/auth/vk`

### ❌ "Network error"
- Проверьте, запущен ли backend (`npm run dev`)
- Проверьте корректность `API_URL`

### ❌ "413 Payload Too Large"
- Максимальный размер файла: 10 MB
- Оптимизируйте размер изображений

## 💾 После загрузки

### Вариант A: Автоматическое создание демо услуг

Используйте готовый скрипт, который создаст 5 демо услуг с загруженными изображениями:

```bash
# Получите JWT токен
tsx get-jwt-token.ts > jwt.txt

# Загрузите изображения
tsx upload-service-images.ts $(cat jwt.txt)

# Создайте демо услуги
tsx create-demo-services.ts $(cat jwt.txt)
```

Скрипт создаст услуги:
- ✅ Стрижка женская — 500 ₽
- ✅ Стрижка мужская — 300 ₽
- ✅ Окрашивание волос — 1200 ₽
- ✅ Маникюр — 400 ₽
- ✅ Педикюр — 500 ₽

### Вариант B: Ручное создание через API

Используйте полученные URL при создании услуг:

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

Ответ:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Стрижка",
  "price": 50000,
  "photo": "http://localhost:9000/crm4max-media/services/a1b2c3d4-e5f6.png"
}
```

## 📝 Дополнительно

- Изображения в папке `design/client/` имеют названия на русском языке
- Поддерживаются форматы: JPEG, PNG, WebP, GIF
- Каждый файл получает UUID 4 в качестве имени в S3
