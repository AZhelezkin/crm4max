import fs from 'fs';
import path from 'path';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

interface UploadResult {
  fileName: string;
  url: string;
  folder: string;
}

interface ServiceResult {
  name: string;
  description: string;
  price: number; // в копейках
  duration: number; // в минутах
  photo?: string;
  success: boolean;
  error?: string;
}

/**
 * Предопределенные услуги для демо
 */
const DEMO_SERVICES = [
  {
    name: 'Стрижка женская',
    description: 'Профессиональная стрижка с укладкой',
    price: 50000, // 500 рублей
    duration: 45,
    imageIndex: 0,
  },
  {
    name: 'Стрижка мужская',
    description: 'Классическая мужская стрижка',
    price: 30000,
    duration: 30,
    imageIndex: 1,
  },
  {
    name: 'Окрашивание волос',
    description: 'Полное окрашивание + тонирование',
    price: 120000,
    duration: 90,
    imageIndex: 2,
  },
  {
    name: 'Маникюр',
    description: 'Маникюр + лак премиум',
    price: 40000,
    duration: 60,
    imageIndex: 3,
  },
  {
    name: 'Педикюр',
    description: 'Педикюр + лак',
    price: 50000,
    duration: 60,
    imageIndex: 4,
  },
];

/**
 * Загружает результаты от upload-service-images.ts
 */
function loadUploadResults(filePath?: string): UploadResult[] {
  let resultsFile = filePath;

  if (!resultsFile) {
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      throw new Error('❌ Папка results/ не найдена. Сначала запустите: tsx upload-service-images.ts');
    }

    const files = fs
      .readdirSync(resultsDir)
      .filter((f) => f.startsWith('upload-results-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error('❌ Файлы результатов не найдены. Сначала запустите: tsx upload-service-images.ts');
    }

    resultsFile = path.join(resultsDir, files[0]);
  }

  console.log(`📂 Загрузка результатов из: ${resultsFile}\n`);

  const content = fs.readFileSync(resultsFile, 'utf-8');
  const data = JSON.parse(content);

  if (!Array.isArray(data.results)) {
    throw new Error('❌ Неверный формат файла результатов');
  }

  return data.results;
}

/**
 * Создает услугу через API
 */
async function createService(
  name: string,
  description: string,
  price: number,
  duration: number,
  photo: string | undefined,
  token: string,
): Promise<ServiceResult> {
  try {
    const response = await axios.post(
      `${API_URL}/services`,
      {
        name,
        description,
        price,
        duration,
        ...(photo && { photo }),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log(`  ✅ ${name}`);
    return { name, description, price, duration, success: true };
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.error || error.message
      : String(error);

    console.error(`  ❌ ${name}: ${message}`);
    return { name, description, price, duration, success: false, error: message };
  }
}

/**
 * Основная функция
 */
async function main(): Promise<void> {
  const token = process.argv[2];
  const resultsFile = process.argv[3];

  if (!token) {
    console.error('❌ Использование: tsx create-demo-services.ts <JWT_TOKEN> [results_file.json]');
    console.error(
      '\n💡 Сначала получите токен: tsx get-jwt-token.ts\n' +
        '💡 И загрузите изображения: tsx upload-service-images.ts <JWT_TOKEN>\n',
    );
    process.exit(1);
  }

  console.log('🛍️  CRM4Max — Создание демо услуг\n');
  console.log(`📍 API: ${API_URL}\n`);

  try {
    const uploadedImages = loadUploadResults(resultsFile);

    if (uploadedImages.length === 0) {
      console.error('❌ Загруженные изображения не найдены');
      process.exit(1);
    }

    console.log(`✅ Найдено загруженных изображений: ${uploadedImages.length}\n`);
    console.log('📝 Создание услуг...\n');

    const results: ServiceResult[] = [];

    for (const service of DEMO_SERVICES) {
      const photoUrl =
        service.imageIndex < uploadedImages.length
          ? uploadedImages[service.imageIndex].url
          : undefined;

      const result = await createService(
        service.name,
        service.description,
        service.price,
        service.duration,
        photoUrl,
        token,
      );

      results.push(result);
    }

    console.log('\n' + '─'.repeat(60));
    const successful = results.filter((r) => r.success).length;
    console.log(`✅ Успешно создано: ${successful}/${results.length} услуг`);
    console.log('─'.repeat(60));

    if (successful > 0) {
      console.log('\n📋 Созданные услуги:');
      results
        .filter((r) => r.success)
        .forEach((r) => {
          const price = (r.price / 100).toFixed(0);
          console.log(`  • ${r.name} — ${price} ₽ (${r.duration} мин)`);
        });
    }

    if (results.some((r) => !r.success)) {
      console.log('\n⚠️  Ошибки при создании:');
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  • ${r.name}: ${r.error}`);
        });
    }

    console.log();
  } catch (error) {
    console.error('💥 Ошибка:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
