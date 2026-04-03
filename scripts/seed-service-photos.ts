import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

// ─── Конфиг ───────────────────────────────────────────────────────────────────

const BUCKET = process.env.S3_BUCKET || 'crm4max-media'
const IMAGES_DIR = path.join(__dirname, '../design/client')
const TEMP_DIR = path.join(__dirname, '../temp-seed-images')

// Services with descriptions for test images
const SERVICE_PHOTOS = [
  { name: 'manicure-1.jpg', desc: 'Маникюр классический' },
  { name: 'manicure-2.jpg', desc: 'Маникюр дизайн' },
  { name: 'pedicure-1.jpg', desc: 'Педикюр стандартный' },
  { name: 'pedicure-2.jpg', desc: 'Педикюр с гель-лаком' },
  { name: 'haircut-1.jpg', desc: 'Стрижка мужская' },
  { name: 'haircut-2.jpg', desc: 'Окрашивание волос' },
  { name: 'spa-1.jpg', desc: 'SPA процедура' },
  { name: 'microblading-1.jpg', desc: 'Микроблейдинг' },
]

// ─── Генерация простых тестовых картинок ──────────────────────────────────────

function createPlaceholderImage(filename: string, desc: string): Buffer {
  // Создаём простой PNG (1x1 пиксель - минимальный размер)
  // PNG signature + IHDR chunk
  const png = Buffer.from([
    // PNG signature
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    // IHDR chunk (13 bytes data)
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde,
    // IDAT chunk (1 byte data + filter)
    0x00, 0x00, 0x00, 0x0c,
    0x49, 0x44, 0x41, 0x54,
    0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
    0x03, 0x01, 0x01, 0x00,
    0x18, 0xdd, 0x8d, 0xb4,
    // IEND chunk
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44,
    0xae, 0x42, 0x60, 0x82,
  ])

  return png
}

// ─── Загрузка в S3 через yc s3 ────────────────────────────────────────────────

function uploadToYandexS3(localPath: string, s3Path: string): string {
  try {
    const cmd = `yc s3 cp "${localPath}" "s3://${BUCKET}/${s3Path}"`
    console.log(`  ⬆️  ${cmd}`)
    execSync(cmd, { encoding: 'utf-8' })
    return `https://${BUCKET}.storage.yandexcloud.net/${s3Path}`
  } catch (error) {
    throw new Error(`S3 upload failed: ${error}`)
  }
}

// ─── Главная функция ──────────────────────────────────────────────────────────

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║      Генерация и загрузка seed фото услуг в S3              ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    // Создаём временную директорию
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true })
      console.log(`📁 Создана временная папка: ${TEMP_DIR}\n`)
    }

    // Генерируем тестовые картинки
    console.log('🎨 Генерация тестовых картинок...\n')
    const imagePaths: Array<{ name: string; path: string; desc: string }> = []

    for (const photo of SERVICE_PHOTOS) {
      const filePath = path.join(TEMP_DIR, photo.name)
      const buffer = createPlaceholderImage(photo.name, photo.desc)
      fs.writeFileSync(filePath, buffer)
      imagePaths.push({ name: photo.name, path: filePath, desc: photo.desc })
      console.log(`  ✅ ${photo.name} (${photo.desc})`)
    }

    // Получаем первую услугу
    const services = await prisma.service.findMany({
      take: 1,
    })

    if (services.length === 0) {
      console.error('\n❌ Услуги не найдены в БД. Создайте услуги через API.')
      process.exit(1)
    }

    const service = services[0]
    console.log(`\n📋 Выбрана услуга: ${service.name} (ID: ${service.id})`)

    // Загружаем в S3
    console.log('\n⬆️  Загрузка в Yandex Object Storage...\n')
    let uploadedCount = 0
    const results = []

    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i]
      try {
        const s3Path = `work/${Date.now()}-${i}-${imagePath.name}`
        const url = uploadToYandexS3(imagePath.path, s3Path)

        // Сохраняем в БД
        const photo = await prisma.servicePhoto.create({
          data: {
            serviceId: service.id,
            url,
            order: i,
          },
        })

        results.push({
          id: photo.id,
          fileName: imagePath.name,
          url,
          order: i,
        })

        console.log(`  ✅ Загружено: ${url}`)
        uploadedCount++
      } catch (error) {
        console.error(`  ❌ Ошибка загрузки ${imagePath.name}: ${error}`)
      }
    }

    // Результаты
    console.log(`\n✅ Успешно загружено: ${uploadedCount} / ${SERVICE_PHOTOS.length} картинок\n`)

    console.log('📊 Результаты загрузки:\n')
    results.forEach((r) => {
      console.log(`  ID:       ${r.id}`)
      console.log(`  Картинка: ${r.fileName}`)
      console.log(`  URL:      ${r.url}`)
      console.log(`  Порядок:  ${r.order}\n`)
    })

    // Сохраняем результаты в JSON
    const outputDir = path.join(__dirname, '../results')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputFile = path.join(outputDir, `seed-photos-${Date.now()}.json`)
    fs.writeFileSync(
      outputFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          service: {
            id: service.id,
            name: service.name,
          },
          uploaded: uploadedCount,
          total: SERVICE_PHOTOS.length,
          photos: results,
        },
        null,
        2,
      ),
    )

    console.log(`📝 Результаты сохранены: ${outputFile}\n`)

    // Очистим временные файлы
    console.log('🧹 Удаление временных файлов...')
    for (const imagePath of imagePaths) {
      fs.unlinkSync(imagePath.path)
    }
    fs.rmdirSync(TEMP_DIR)
    console.log('  ✅ Очистка завершена\n')
  } catch (error) {
    console.error('\n❌ Ошибка:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
