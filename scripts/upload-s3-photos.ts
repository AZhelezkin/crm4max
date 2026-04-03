import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

// ─── Конфиг S3 ────────────────────────────────────────────────────────────────

const S3_REGION = process.env.S3_REGION || 'us-east-1'
const S3_BUCKET = process.env.S3_BUCKET || ''
const S3_ENDPOINT = process.env.S3_ENDPOINT
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || ''
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || ''

const s3 = new S3Client({
  region: S3_REGION,
  ...(S3_ENDPOINT
    ? {
        endpoint: S3_ENDPOINT,
        forcePathStyle: true,
      }
    : {}),
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
})

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function buildPublicUrl(key: string): string {
  if (S3_PUBLIC_URL) {
    return `${S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`
  }
  if (S3_ENDPOINT) {
    return `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET}/${key}`
  }
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }
  return mimes[ext] || 'application/octet-stream'
}

function getImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Директория не найдена: ${dir}`)
    return []
  }

  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    .map((f) => path.join(dir, f))
}

// ─── Загрузка файла в S3 ──────────────────────────────────────────────────────

async function uploadToS3(
  filePath: string,
  folder: string,
): Promise<string> {
  const fileName = path.basename(filePath)
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase() || '.jpg'
  const key = `${folder}/${randomUUID()}${ext}`

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: getMimeType(filePath),
    }),
  )

  const url = buildPublicUrl(key)
  console.log(`  ✅ ${fileName} → ${url}`)
  return url
}

// ─── Основная функция ─────────────────────────────────────────────────────────

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║      Загрузка фото работ в S3 и сохранение в БД             ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    if (!S3_BUCKET) {
      throw new Error('❌ S3_BUCKET не установлен в .env')
    }

    // Получаем список услуг
    const services = await prisma.service.findMany({
      include: { master: true, category: true },
    })

    if (services.length === 0) {
      console.error('❌ Услуги не найдены в БД. Сначала создайте услуги через API.')
      process.exit(1)
    }

    console.log('📋 Доступные услуги:')
    services.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} (${s.master.name})`)
    })

    // Выбираем первую услугу (или можно спросить пользователя)
    const selectedService = services[0]
    console.log(`\n✅ Выбрана услуга: ${selectedService.name}`)
    console.log(`   ID: ${selectedService.id}`)

    // Получаем картинки
    const imagesDir = path.join(__dirname, '../design/client')
    const imagePaths = getImageFiles(imagesDir)

    if (imagePaths.length === 0) {
      console.error(`❌ Картинки не найдены в ${imagesDir}`)
      process.exit(1)
    }

    console.log(`\n🖼️  Найдено картинок: ${imagePaths.length}`)
    console.log('\n⬆️  Загрузка в S3...\n')

    // Загружаем каждую картинку
    let order = 0
    const uploadedPhotos = []

    for (const imagePath of imagePaths) {
      const url = await uploadToS3(imagePath, 'work')

      // Сохраняем в БД
      const photo = await prisma.servicePhoto.create({
        data: {
          serviceId: selectedService.id,
          url,
          order: order++,
        },
      })

      uploadedPhotos.push({ fileName: path.basename(imagePath), url, photoId: photo.id })
    }

    console.log(`\n✅ Успешно загружено: ${uploadedPhotos.length} картинок`)
    console.log('\n📊 Результаты:\n')

    uploadedPhotos.forEach((p) => {
      console.log(`  ID: ${p.photoId}`)
      console.log(`  Файл: ${p.fileName}`)
      console.log(`  URL: ${p.url}\n`)
    })

    // Сохраняем результаты в JSON
    const outputDir = path.join(__dirname, '../results')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputFile = path.join(outputDir, `s3-upload-results-${Date.now()}.json`)
    fs.writeFileSync(
      outputFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          service: {
            id: selectedService.id,
            name: selectedService.name,
          },
          total: uploadedPhotos.length,
          photos: uploadedPhotos,
        },
        null,
        2,
      ),
    )

    console.log(`📝 Результаты сохранены: ${outputFile}\n`)
  } catch (error) {
    console.error('\n❌ Ошибка:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
