import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║      Чтение каталога услуг из продакшн БД                   ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    // Получаем все услуги с категориями
    const services = await prisma.service.findMany({
      include: {
        master: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true },
        },
        workPhotos: {
          select: { id: true, url: true, order: true },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: [{ masterId: 'asc' }, { categoryId: 'asc' }],
    })

    if (services.length === 0) {
      console.log('❌ Услуг не найдено\n')
      process.exit(0)
    }

    console.log(`📋 Найдено услуг: ${services.length}\n`)

    // Группируем по мастерам
    const byMaster = new Map<string, typeof services>()

    for (const service of services) {
      const masterId = service.masterId
      if (!byMaster.has(masterId)) {
        byMaster.set(masterId, [])
      }
      byMaster.get(masterId)!.push(service)
    }

    // Выводим услуги
    for (const [masterId, masterServices] of byMaster) {
      const master = masterServices[0].master
      console.log(`👤 Мастер: ${master.name}`)
      console.log(`   ID: ${master.id}\n`)

      // Группируем по категориям
      const byCategory = new Map<string, typeof masterServices>()
      for (const service of masterServices) {
        const catId = service.categoryId || 'no-category'
        if (!byCategory.has(catId)) {
          byCategory.set(catId, [])
        }
        byCategory.get(catId)!.push(service)
      }

      for (const [catId, catServices] of byCategory) {
        const category = catServices[0].category
        if (category) {
          console.log(`   📂 Категория: ${category.name}`)
        } else {
          console.log(`   📂 Услуги без категории`)
        }

        for (const service of catServices) {
          const price = (service.price / 100).toFixed(2)
          const duration = service.duration
          const discount = service.discountPercent ? ` (-${service.discountPercent}%)` : ''
          const photos = service.workPhotos.length
          const bookings = service._count.bookings

          console.log(
            `      • ${service.name.padEnd(25)} ${price}₽ (${duration}м)${discount} [${photos} фото] [${bookings} записей]`,
          )
          console.log(`        ID: ${service.id}`)

          if (service.workPhotos.length > 0) {
            service.workPhotos.forEach((p) => {
              console.log(`        📸 [${p.order}] ${p.url}`)
            })
          }
        }

        console.log()
      }

      console.log()
    }

    // Статистика
    console.log('📊 Статистика:\n')

    const stats = await prisma.$queryRaw<
      Array<{
        master_id: string
        master_name: string
        service_count: number
        photo_count: number
        booking_count: number
      }>
    >`
      SELECT 
        m.id as master_id,
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

    for (const row of stats) {
      console.log(`  ${row.master_name}:`)
      console.log(`    - Услуг: ${row.service_count}`)
      console.log(`    - Фото работ: ${row.photo_count}`)
      console.log(`    - Записей: ${row.booking_count}\n`)
    }

    console.log(
      `✅ Всего: ${services.length} услуг, ${services.reduce((sum, s) => sum + (s.workPhotos?.length || 0), 0)} фото\n`,
    )
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Ошибка подключения к БД:')
      console.error(error.message)
    } else {
      console.error('\n❌ Неизвестная ошибка:', error)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
