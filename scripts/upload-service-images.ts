import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const IMAGES_DIR = path.join(__dirname, '../design/client');

interface UploadResult {
  fileName: string;
  url: string;
  folder: string;
}

/**
 * Загружает одно изображение в S3 через API
 */
async function uploadImage(
  filePath: string,
  folder: string,
  token: string,
): Promise<UploadResult | null> {
  const fileName = path.basename(filePath);

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: getMimeType(filePath) });
    formData.append('file', blob, fileName);

    const response = await fetch(`${API_URL}/upload?folder=${folder}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`  ❌ HTTP ${response.status}: ${error}`);
      return null;
    }

    const data = (await response.json()) as { url: string };
    console.log(`  ✅ ${fileName} → ${data.url}`);
    return { fileName, url: data.url, folder };
  } catch (error) {
    console.error(`  ❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Определяет MIME-тип по расширению
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return mimes[ext] || 'application/octet-stream';
}

/**
 * Получает список всех изображений в директории
 */
function getImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Директория не найдена: ${dir}`);
  }

  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    .map((f) => path.join(dir, f));
}

/**
 * Сохраняет результаты загрузки в JSON файл
 */
function saveResults(results: UploadResult[]): void {
  const outputDir = path.join(__dirname, '../results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `upload-results-${Date.now()}.json`);
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        total: results.length,
        results,
      },
      null,
      2,
    ),
  );

  console.log(`\n📄 Результаты сохранены в: ${outputFile}`);
}

/**
 * Основная функция
 */
async function main(): Promise<void> {
  const token = process.argv[2];

  if (!token) {
    console.error('❌ Использование: tsx upload-service-images.ts <JWT_TOKEN>');
    console.error('\n💡 Сначала получите JWT токен:');
    console.error('   POST http://localhost:3000/api/auth/vk');
    console.error('   Body: { "token": "<VK_SILENT_AUTH_TOKEN>" }');
    process.exit(1);
  }

  console.log('🖼️  CRM4Max — Загрузка изображений услуг\n');
  console.log(`📁 Директория: ${IMAGES_DIR}`);
  console.log(`🔗 API URL: ${API_URL}\n`);

  try {
    const files = getImageFiles(IMAGES_DIR);
    console.log(`📂 Найдено изображений: ${files.length}\n`);

    if (files.length === 0) {
      console.log('⚠️  Нет изображений для загрузки');
      return;
    }

    console.log('⏳ Загрузка в прогрессе...\n');

    const results: UploadResult[] = [];
    for (const filePath of files) {
      const result = await uploadImage(filePath, 'services', token);
      if (result) {
        results.push(result);
      }
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ Успешно загружено: ${results.length}/${files.length}`);
    console.log('-'.repeat(50));

    if (results.length > 0) {
      saveResults(results);

      // Вывести SQL для вставки в базу
      console.log('\n📋 Пример использования URL в TypeScript:\n');
      console.log(
        'const servicePhotos = [',
        results.map((r) => `  "${r.url}"`).join(',\n'),
        '];',
      );
    }
  } catch (error) {
    console.error('💥 Ошибка:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
