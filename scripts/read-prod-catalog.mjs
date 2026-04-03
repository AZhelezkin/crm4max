import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Парсим .env файл вручную
function loadEnv(filePath) {
  const envContent = fs.readFileSync(filePath, 'utf-8')
  const env = {}

  envContent.split('\n').forEach((line) => {
    line = line.trim()
    if (!line || line.startsWith('#')) return

    const [key, ...valueParts] = line.split('=')
    let value = valueParts.join('=').trim()

    // Убираем кавычки
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    env[key] = value
  })

  return env
}

// Динамически загружаем Prisma
async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const envPath = path.join(__dirname, '../backend/.env')

  // Загружаем переменные окружения
  const env = loadEnv(envPath)
  process.env.DATABASE_URL = env.DATABASE_URL

  // Теперь импортируем Prisma
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║      Подключение к продакшн БД (Yandex Cloud)              ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('📡 Подключение к БД...')
    console.log(`   ${env.DATABASE_URL?.substring(0, 50)}...\n`)

    // Проверка подключения
    const result = await prisma.$queryRaw`SELECT 1 as connection_test`
    console.log('✅ Подключение успешно!\n')

    // Получаем все услуги
    const services = await prisma.service.findMany({
      include: {
        master: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
        workPhotos: {
          select: {
            url: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ masterId: 'asc' }, { name: 'asc' }],
    })

    if (services.length === 0) {
      console.log('❌ Услуг не найдено в БД\n')
      process.exit(0)
    }

    console.log(`📋 КАТАЛОГ УСЛУГ: ${services.length} услуг\n`)
    console.log('═════════════════════════════════════════════════════════════\n')

    // Группируем по мастерам
    const byMaster = new Map()
    for (const service of services) {
      if (!byMaster.has(service.masterId)) {
        byMaster.set(service.masterId, {
          master: service.master,
          services: [],
        })
      }
      byMaster.get(service.masterId).services.push(service)
    }

    // Выводим
    let num = 1
    for (const { master, services: masterServices } of byMaster.values()) {
      console.log(`👤 ${master.name.toUpperCase()}`)
      console.log(`   ID: ${master.id}`)
      if (master.description) {
        console.log(`   ${master.description}`)
      }
      console.log()

      for (const service of masterServices) {
        const price = (service.price / 100).toFixed(2)
        const duration = service.durationMin
        const category = service.category?.name || ''
        const discount = service.discountPercent ? ` | -${service.discountPercent}%` : ''

        console.log(`   ${num}. ${service.name} ${category ? `(${category})` : ''}`)
        console.log(`      💰 ${price}₽ | ⏱️  ${duration} мин${discount}`)
        console.log(`      ID: ${service.id}`)

        if (service.workPhotos?.length > 0) {
          console.log(`      📸 Фото: ${service.workPhotos.length} шт`)
          for (const photo of service.workPhotos) {
            console.log(`         • ${photo.url}`)
          }
        }
        console.log()
        num++
      }
    }

    console.log('═════════════════════════════════════════════════════════════\n')
    console.log('✅ Всего услуг загружено:', services.length, '\n')
  } catch (error) {
    console.error('\n❌ Ошибка подключения:')
    console.error(`   ${error.message}\n`)

    if (error.message.includes('ECONNREFUSED') || error.message.includes('connect ECONNREFUSED')) {
      console.error('   Возможные причины:')
      console.error('   • БД недоступна из текущей сети')
      console.error('   • Неправильные учетные данные в .env\n')
    }

    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
