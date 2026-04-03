#!/usr/bin/env node

/**
 * Скрипт для загрузки изображений услуг в S3
 * Использование: node upload-service-images.js <JWTtoken> <masterId>
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const IMAGES_DIR = path.join(__dirname, '../design/client');

async function uploadImage(filePath, folder, token) {
  try {
    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);
    
    const formData = new FormData();
    formData.append('file', fileStream, fileName);

    const response = await axios.post(`${API_URL}/upload?folder=${folder}`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log(`✅ Загружено: ${fileName} → ${response.data.url}`);
    return response.data.url;
  } catch (error) {
    console.error(`❌ Ошибка при загрузке ${filePath}:`, error.response?.data || error.message);
    return null;
  }
}

async function main() {
  const token = process.argv[2];
  const masterId = process.argv[3];

  if (!token) {
    console.error('❌ Использование: node upload-service-images.js <JWT_token> [masterId]');
    console.error('   JWT_token - токен авторизации');
    console.error('   masterId - ID мастера (опционально)');
    process.exit(1);
  }

  console.log(`📸 Загрузка изображений услуг из: ${IMAGES_DIR}`);
  console.log(`🔗 API URL: ${API_URL}`);

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Директория не найдена: ${IMAGES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(IMAGES_DIR).filter(f => {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(f);
  });

  console.log(`\n📂 Найдено файлов: ${files.length}\n`);

  const urls = [];
  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file);
    const url = await uploadImage(filePath, 'services', token);
    if (url) {
      urls.push({ name: file, url });
    }
  }

  console.log(`\n✅ Завершено! Загружено: ${urls.length}/${files.length} изображений\n`);

  // Вывести список URL в JSON для использования в коде
  console.log('📄 JSON с URL-адресами:');
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    masterId: masterId || 'unknown',
    images: urls,
  }, null, 2));
}

main().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
