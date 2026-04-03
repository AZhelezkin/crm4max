import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║      Подключение к продакшн БД (Yandex Cloud)              ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    // Проверка подключения
    console.log('📡 Подключение к БД...')
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Подключение успешно!\n')

    // Получаем все услуги с мастерами и фото
    const services = await prisma.service.findMany({
      include: {
        master: {
          select: {
            id: true,
            name: true,
            photo: true,
            description: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        workPhotos: {
          select: {
            id: true,
            url: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ masterId: 'asc' }, { categoryId: 'asc' }, { name: 'asc' }],
    })

    if (services.length === 0) {
      console.log('❌ Услуг не найдено в БД\n')
      process.exit(0)
    }

    console.log(`📋 Каталог услуг: ${services.length} услуг\n`)
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

    // Выводим каталог
    let serviceNum = 1

    for (const { master, services: masterServices } of byMaster.values()) {
      console.log(`👤 МАСТЕР: ${master.name}`)
      console.log(`   ID мастера: ${master.id}`)
      if (master.description) {
        console.log(`   Описание: ${master.description}`)
      }
      console.log()

      // Группируем по категориям
      const byCategory = new Map()
      for (const service of masterServices) {
        const catKey = service.category?.name || 'Без категории'
        if (!byCategory.has(catKey)) {
          byCategory.set(catKey, [])
        }
        byCategory.get(catKey).push(service)
      }

      for (const [category, categoryServices] of byCategory) {
        console.log(`   📂 ${category}:`)
        console.log()

        for (const service of categoryServices) {
          const price = (service.price / 100).toFixed(2)
          const duration = service.durationMin
          const durationMax = service.durationMax ? `-${service.durationMax}` : ''
          const discount = service.discountPercent ? ` | Скидка: ${service.discountPercent}%` : ''
          const active = service.isActive ? '✓' : '✗'

          console.log(`      ${serviceNum}. ${service.name}`)
          console.log(`         💰 ${price}₽ | ⏱️  ${duration}${durationMax} мин${discount}`)
          console.log(`         ID: ${service.id} | Статус: ${active}`)

          if (service.description) {
            console.log(`         📝 ${service.description}`)
          }

          // Показываем фото работ
          if (service.workPhotos && service.workPhotos.length > 0) {
            console.log(`         📸 Фото работ (${service.workPhotos.length}):`)
            for (const photo of service.workPhotos) {
              console.log(`            [${photo.order}] ${photo.url}`)
            }
          }

          console.log()
          serviceNum++
        }
      }

      console.log('═════════════════════════════════════════════════════════════\n')
    }

    // Статистика
    console.log('📊 СТАТИСТИКА:\n')

    const counts = await prisma.$queryRaw`
      SELECT 
        m.name as master_name,
        COUNT(DISTINCT s.id) as service_count,
        COUNT(DISTINCT sp.id) as photo_count,
        COUNT(DISTINCT b.id) as booking_count
      FROM masters m
      LEFT JOIN services s ON m.id = s.master_id
      LEFT JOIN service_photos sp ON s.id = sp.service_id
      LEFT JOIN bookings b ON s.id = b.service_id
      GROUP BY m.id, m.name
      ORDER BY m.name
    `

    for (const row of counts) {
      console.log(`   ${row.master_name}:`)
      console.log(`      • Услуг: ${row.service_count}`)
      console.log(`      • Фото работ: ${row.photo_count}`)
      console.log(`      • Записей: ${row.booking_count}\n`)
    }

    const totalPhotos = services.reduce((sum, s) => sum + (s.workPhotos?.length || 0), 0)
    console.log(`✅ Всего: ${services.length} услуг, ${totalPhotos} фото работ\n`)
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Ошибка подключения к БД:')
      console.error(`   ${error.message}\n`)

      if (error.message.includes('ECONNREFUSED')) {
        console.error('   Убедитесь, что:')
        console.error('   • Yandex Cloud БД доступна из вашей сети')
        console.error('   • DATABASE_URL установлен правильно')
        console.error('   • Проверьте файл backend/.env\n')
      }
    } else {
      console.error('❌ Неизвестная ошибка:', error)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
