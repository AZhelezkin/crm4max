const fs = require('fs');
const path = require('path');

const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../design/client');

// ─── Генерация простого цветного PNG ──────────────────────────────────────────

function createColoredPNG(width, height, hexColor) {
  // Парсим hex цвет (например: #FF5733 → [255, 87, 51])
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Создаём пиксель данные (RGB для каждого пикселя)
  const pixelData = Buffer.alloc(width * height * 3);

  for (let i = 0; i < width * height; i++) {
    pixelData[i * 3] = r;
    pixelData[i * 3 + 1] = g;
    pixelData[i * 3 + 2] = b;
  }

  // PNG структура
  const png = Buffer.concat([
    // PNG signature
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),

    // IHDR chunk
    createChunk('IHDR', Buffer.concat([
      createUint32(width),
      createUint32(height),
      Buffer.from([8, 2, 0, 0, 0]), // bit depth, color type, compression, filter, interlace
    ])),

    // IDAT chunk (simplified)
    createChunk('IDAT', Buffer.from([0x08, 0x99, 0x63, 0x00, 0x00, 0x00, 0x00])),

    // IEND chunk
    createChunk('IEND', Buffer.alloc(0)),
  ]);

  return png;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length);

  const chunkData = Buffer.concat([typeBuffer, data]);
  const crc32 = calculateCRC32(chunkData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32);

  return Buffer.concat([lengthBuffer, chunkData, crcBuffer]);
}

function createUint32(value) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value);
  return buf;
}

function calculateCRC32(data) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── Данные картинок ──────────────────────────────────────────────────────────

const IMAGES = [
  { name: 'manicure-1.jpg', color: '#FF69B4', desc: '💅 Маникюр классический' },
  { name: 'manicure-2.jpg', color: '#FFB6D9', desc: '💅 Маникюр дизайн' },
  { name: 'pedicure-1.jpg', color: '#FF1493', desc: '🦶 Педикюр стандартный' },
  { name: 'pedicure-2.jpg', color: '#DB7093', desc: '🦶 Педикюр гель-лак' },
  { name: 'haircut-1.jpg', color: '#8B4513', desc: '✂️ Стрижка мужская' },
  { name: 'haircut-2.jpg', color: '#A0522D', desc: '🎨 Окрашивание' },
  { name: 'spa-1.jpg', color: '#20B2AA', desc: '💆 SPA процедура' },
  { name: 'lashes.jpg', color: '#FFD700', desc: '✨ Наращивание ресниц' },
];

// ─── Главная функция ──────────────────────────────────────────────────────────

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║      Генерация seed картинок для услуг                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Создаём папку, если её нет
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`📁 Создана папка: ${OUTPUT_DIR}\n`);
    }

    console.log('🎨 Генерация тестовых картинок (200x200px, PNG)...\n');

    let created = 0;
    for (const img of IMAGES) {
      const filePath = path.join(OUTPUT_DIR, img.name);

      // Пропускаем, если уже существует
      if (fs.existsSync(filePath)) {
        console.log(`  ⏭️  ${img.name.padEnd(20)} - уже существует`);
        continue;
      }

      const buffer = createColoredPNG(200, 200, img.color);
      fs.writeFileSync(filePath, buffer);

      console.log(`  ✅ ${img.name.padEnd(20)} ${img.desc}`);
      created++;
    }

    console.log(`\n✅ Создано ${created} картинок, всего ${IMAGES.length}\n`);

    // Показываем список
    console.log('📂 Созданные файлы:\n');
    const files = fs.readdirSync(OUTPUT_DIR).filter((f) => /\.(jpg|png|webp|gif)$/i.test(f));

    files.forEach((f, i) => {
      const fullPath = path.join(OUTPUT_DIR, f);
      const size = fs.statSync(fullPath).size;
      console.log(`  ${i + 1}. ${f.padEnd(25)} (${size} bytes)`);
    });

    console.log(`\n📍 Папка с картинками:`);
    console.log(`   ${OUTPUT_DIR}\n`);

    console.log('📸 Просмотрите картинки перед загрузкой - они находятся в папке выше\n');

    console.log('🚀 Дальше можно запустить загрузку командой:');
    console.log(`   cd scripts && node seed-service-photos.js\n`);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();
