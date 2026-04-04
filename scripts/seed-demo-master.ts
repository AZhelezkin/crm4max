/**
 * seed-demo-master.ts
 *
 * Создаёт демо-мастера "Виктория Лебедева" — мастер ногтевого сервиса в Москве.
 * Загружает фото работ из Unsplash (публичные бесплатные URL) в Yandex S3.
 *
 * Запуск:
 *   cd backend
 *   npx ts-node --esm ../scripts/seed-demo-master.ts
 *
 * или из корня:
 *   cd backend && npx tsx ../scripts/seed-demo-master.ts
 */

import { PrismaClient, BookingStatus, PaymentStatus, PaymentMethod } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

// ─── S3 конфиг ────────────────────────────────────────────────────────────────

const S3_BUCKET   = process.env.S3_BUCKET   ?? 'crm4max-media'
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'https://storage.yandexcloud.net'
const S3_ACCESS   = process.env.S3_ACCESS_KEY ?? ''
const S3_SECRET   = process.env.S3_SECRET_KEY ?? ''
const S3_REGION   = 'ru-central1'

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: S3_ACCESS, secretAccessKey: S3_SECRET },
})

function publicUrl(key: string) {
  return `https://storage.yandexcloud.net/${S3_BUCKET}/${key}`
}

/** Скачивает URL → Buffer (fetch следует редиректам автоматически) */
async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; crm4max-seed/1.0)' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} при скачивании ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Скачивает фото из URL и кладёт в S3, возвращает публичный URL */
async function uploadPhotoFromUrl(url: string, folder: string): Promise<string> {
  console.log(`  ⬆️  Скачиваю ${url.slice(0, 60)}...`)
  const buf = await downloadBuffer(url)
  const key = `${folder}/${randomUUID()}.jpg`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buf,
    ContentType: 'image/jpeg',
  }))
  const result = publicUrl(key)
  console.log(`  ✅ ${result}`)
  return result
}

// ─── Реальные фото с Unsplash (ногтевой сервис, маникюр, педикюр) ───────────

const PHOTO_SOURCES = {
  // Портрет женщины-мастера
  master: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&q=80',

  // Маникюр — гель-лак, ногтевой дизайн
  manicure: [
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
    'https://images.unsplash.com/photo-1604654894597-20b5e5b4b67c?w=600&q=80',
    'https://images.unsplash.com/photo-1552693673-1bf958298935?w=600&q=80',
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80',
  ],

  // Педикюр
  pedicure: [
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80',
    'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&q=80',
  ],

  // Наращивание
  extensions: [
    'https://images.unsplash.com/photo-1604654894637-f4e776fbd2c1?w=600&q=80',
    'https://images.unsplash.com/photo-1604654894575-2ccaae4e6e18?w=600&q=80',
  ],

  // Дизайн ногтей
  nailart: [
    'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&q=80',
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
    'https://images.unsplash.com/photo-1552693673-1bf958298935?w=600&q=80',
  ],
}

// ─── Главная функция ──────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║     Создание демо-мастера Виктория Лебедева (nail art)       ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  // ── 1. Фото мастера ────────────────────────────────────────────────────────
  console.log('📸 Загружаю фото мастера...')
  const masterPhotoUrl = await uploadPhotoFromUrl(PHOTO_SOURCES.master, 'avatars')

  // ── 2. Создаём мастера ────────────────────────────────────────────────────
  console.log('\n👤 Создаю мастера...')
  const master = await prisma.master.upsert({
    where: { maxUserId: '100003' },
    update: {
      photo: masterPhotoUrl,
      isOnboarded: true,
    },
    create: {
      maxUserId:   '100003',
      firstName:   'Виктория',
      lastName:    'Лебедева',
      name:        'Виктория Лебедева',
      photo:       masterPhotoUrl,
      description: 'Мастер ногтевого сервиса. 6 лет опыта. Специализация: маникюр, педикюр, наращивание, дизайн ногтей. Использую только сертифицированные материалы.',
      contacts:    'Тел: +7 916 234-56-78\nInstagram: @vika_nails_msk',
      location:    'Москва, Патриаршие пруды, Малая Бронная, 20',
      lat:         55.7635,
      lng:         37.5948,
      rating:      4.9,
      isOnboarded: true,
    },
  })
  console.log(`  ✅ Мастер: ${master.name} (id=${master.id})`)

  // ── 3. График работы ──────────────────────────────────────────────────────
  await prisma.schedule.upsert({
    where: { masterId: master.id },
    update: {},
    create: {
      masterId:       master.id,
      workingDays:    [1, 2, 3, 4, 5, 6], // Пн-Сб
      startTime:      '10:00',
      endTime:        '21:00',
      breakStart:     '14:00',
      breakEnd:       '15:00',
      bufferMinutes:  10,
    },
  })
  console.log('  ✅ График: Пн–Сб 10:00–21:00')

  // ── 4. Категории + услуги + фото работ ───────────────────────────────────

  // Удаляем старые данные мастера если были (порядок важен для FK)
  const oldBookings = await prisma.booking.findMany({ where: { masterId: master.id }, select: { id: true } })
  for (const bk of oldBookings) {
    await prisma.review.deleteMany({ where: { bookingId: bk.id } })
    await prisma.payment.deleteMany({ where: { bookingId: bk.id } })
  }
  await prisma.booking.deleteMany({ where: { masterId: master.id } })
  const oldSvcs = await prisma.service.findMany({ where: { masterId: master.id }, select: { id: true } })
  for (const svc of oldSvcs) {
    await prisma.servicePhoto.deleteMany({ where: { serviceId: svc.id } })
  }
  await prisma.service.deleteMany({ where: { masterId: master.id } })
  await prisma.category.deleteMany({ where: { masterId: master.id } })

  // ── Категория 1: Маникюр ──────────────────────────────────────────────────
  console.log('\n💅 Категория: Маникюр')
  const catManicure = await prisma.category.create({
    data: { masterId: master.id, name: 'Маникюр', description: 'Классический и аппаратный маникюр' },
  })

  const svcManicureClassic = await prisma.service.create({
    data: {
      masterId:    master.id,
      categoryId:  catManicure.id,
      name:        'Маникюр классический',
      description: 'Обрезной маникюр + покрытие гель-лаком по желанию',
      durationMin: 60,
      price:       250000, // 2 500 ₽
    },
  })

  const svcManicureHardware = await prisma.service.create({
    data: {
      masterId:    master.id,
      categoryId:  catManicure.id,
      name:        'Маникюр аппаратный',
      description: 'Аппаратный маникюр без срезания кутикулы',
      durationMin: 75,
      price:       300000, // 3 000 ₽
    },
  })

  const svcManicureGel = await prisma.service.create({
    data: {
      masterId:      master.id,
      categoryId:    catManicure.id,
      name:          'Маникюр + покрытие гель-лаком',
      description:   'Аппаратный маникюр + цветное покрытие гель-лаком',
      durationMin:   90,
      price:         350000, // 3 500 ₽
      discountPercent: 10,
    },
  })

  const svcManicureRemove = await prisma.service.create({
    data: {
      masterId:    master.id,
      categoryId:  catManicure.id,
      name:        'Снятие гель-лака',
      durationMin: 20,
      price:        80000, // 800 ₽
    },
  })

  // Фото работ для гель-лака
  console.log('  📷 Фото работ...')
  for (let i = 0; i < PHOTO_SOURCES.manicure.length; i++) {
    const url = await uploadPhotoFromUrl(PHOTO_SOURCES.manicure[i], 'work')
    await prisma.servicePhoto.create({
      data: { serviceId: svcManicureGel.id, url, order: i },
    })
  }

  // ── Категория 2: Педикюр ─────────────────────────────────────────────────
  console.log('\n🦶 Категория: Педикюр')
  const catPedicure = await prisma.category.create({
    data: { masterId: master.id, name: 'Педикюр', description: 'Аппаратный и SPA педикюр' },
  })

  const svcPedicure = await prisma.service.create({
    data: {
      masterId:    master.id,
      categoryId:  catPedicure.id,
      name:        'Педикюр аппаратный',
      description: 'Обработка стоп + уход за кутикулой',
      durationMin: 75,
      price:       350000, // 3 500 ₽
    },
  })

  const svcPedicureGel = await prisma.service.create({
    data: {
      masterId:      master.id,
      categoryId:    catPedicure.id,
      name:          'Педикюр + покрытие гель-лаком',
      durationMin:   100,
      price:         450000, // 4 500 ₽
      discountPercent: 15,
    },
  })

  const svcPedicureSpa = await prisma.service.create({
    data: {
      masterId:    master.id,
      categoryId:  catPedicure.id,
      name:        'SPA-педикюр',
      description: 'Педикюр + парафинотерапия + массаж стоп',
      durationMin: 120,
      price:       600000, // 6 000 ₽
    },
  })

  console.log('  📷 Фото работ...')
  for (let i = 0; i < PHOTO_SOURCES.pedicure.length; i++) {
    const url = await uploadPhotoFromUrl(PHOTO_SOURCES.pedicure[i], 'work')
    await prisma.servicePhoto.create({
      data: { serviceId: svcPedicureGel.id, url, order: i },
    })
  }

  // ── Категория 3: Наращивание ── ─────────────────────────────────────────
  console.log('\n💎 Категория: Наращивание ногтей')
  const catExtensions = await prisma.category.create({
    data: { masterId: master.id, name: 'Наращивание', description: 'Гелевое и акриловое наращивание' },
  })

  const svcExtGel = await prisma.service.create({
    data: {
      masterId:    master.id,
      categoryId:  catExtensions.id,
      name:        'Наращивание гелем',
      description: 'Наращивание + коррекция + дизайн по желанию',
      durationMin: 150,
      durationMax: 180,
      price:       600000, // 6 000 ₽
    },
  })

  const svcExtCorrection = await prisma.service.create({
    data: {
      masterId:    master.id,
      categoryId:  catExtensions.id,
      name:        'Коррекция наращивания',
      description: 'Коррекция отросшей базы + выравнивание',
      durationMin: 90,
      durationMax: 120,
      price:       400000, // 4 000 ₽
    },
  })

  const svcExtRemove = await prisma.service.create({
    data: {
      masterId:    master.id,
      categoryId:  catExtensions.id,
      name:        'Снятие наращивания',
      durationMin: 45,
      price:       150000, // 1 500 ₽
    },
  })

  console.log('  📷 Фото работ...')
  for (let i = 0; i < PHOTO_SOURCES.extensions.length; i++) {
    const url = await uploadPhotoFromUrl(PHOTO_SOURCES.extensions[i], 'work')
    await prisma.servicePhoto.create({
      data: { serviceId: svcExtGel.id, url, order: i },
    })
  }

  // ── Категория 4: Дизайн ногтей ───────────────────────────────────────────
  console.log('\n🎨 Категория: Дизайн ногтей')
  const catNailArt = await prisma.category.create({
    data: { masterId: master.id, name: 'Дизайн ногтей', description: 'Nail-арт, стемпинг, фольга, стразы' },
  })

  const svcDesignSimple = await prisma.service.create({
    data: {
      masterId:    master.id,
      categoryId:  catNailArt.id,
      name:        'Дизайн простой (1 ноготь)',
      durationMin: 15,
      price:        30000, // 300 ₽
    },
  })

  const svcDesignFull = await prisma.service.create({
    data: {
      masterId:      master.id,
      categoryId:    catNailArt.id,
      name:          'Дизайн на все ногти',
      description:   'Nail-арт на все ногти: стемпинг, фольга или ручная роспись',
      durationMin:   60,
      durationMax:   90,
      price:         250000, // 2 500 ₽
      discountPercent: 20,
    },
  })

  const svcFrench = await prisma.service.create({
    data: {
      masterId:    master.id,
      categoryId:  catNailArt.id,
      name:        'Французский маникюр (Френч)',
      description: 'Классический или цветной френч на натуральных ногтях или наращивании',
      durationMin: 30,
      price:       150000, // 1 500 ₽
    },
  })

  console.log('  📷 Фото работ...')
  for (let i = 0; i < PHOTO_SOURCES.nailart.length; i++) {
    const url = await uploadPhotoFromUrl(PHOTO_SOURCES.nailart[i], 'work')
    await prisma.servicePhoto.create({
      data: { serviceId: svcDesignFull.id, url, order: i },
    })
  }

  // ── 5. Клиенты ───────────────────────────────────────────────────────────
  console.log('\n👥 Создаю клиентов...')
  const client1 = await prisma.client.upsert({
    where: { vkUserId: '300001' },
    update: {},
    create: { vkUserId: '300001', name: 'Ольга Николаева', phone: '+7 916 300-11-22', photo: 'https://i.pravatar.cc/300?img=47' },
  })
  const client2 = await prisma.client.upsert({
    where: { vkUserId: '300002' },
    update: {},
    create: { vkUserId: '300002', name: 'Анастасия Громова', phone: '+7 903 300-33-44', photo: 'https://i.pravatar.cc/300?img=56' },
  })
  const client3 = await prisma.client.upsert({
    where: { vkUserId: '300003' },
    update: {},
    create: { vkUserId: '300003', name: 'Дарья Фролова', phone: '+7 925 300-55-66', photo: 'https://i.pravatar.cc/300?img=32' },
  })
  const client4 = await prisma.client.upsert({
    where: { vkUserId: '300004' },
    update: {},
    create: { vkUserId: '300004', name: 'Екатерина Морозова', phone: '+7 906 300-77-88', photo: 'https://i.pravatar.cc/300?img=48' },
  })

  // ── 6. Записи ────────────────────────────────────────────────────────────
  console.log('\n📅 Создаю записи...')

  // Завершённые
  const b1 = await prisma.booking.create({
    data: {
      masterId: master.id, clientId: client1.id, serviceId: svcManicureGel.id,
      date: '2026-03-05', time: '11:00',
      status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.PAID,
    },
  })
  const b2 = await prisma.booking.create({
    data: {
      masterId: master.id, clientId: client2.id, serviceId: svcExtGel.id,
      date: '2026-03-12', time: '12:00',
      status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.PAID,
    },
  })
  const b3 = await prisma.booking.create({
    data: {
      masterId: master.id, clientId: client3.id, serviceId: svcPedicureGel.id,
      date: '2026-03-20', time: '14:00',
      status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.DEPOSIT_PAID,
      depositAmount: 100000,
    },
  })
  const b4 = await prisma.booking.create({
    data: {
      masterId: master.id, clientId: client4.id, serviceId: svcDesignFull.id,
      date: '2026-03-28', time: '16:00',
      status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.PAID,
    },
  })

  // Предстоящие
  const b5 = await prisma.booking.create({
    data: {
      masterId: master.id, clientId: client1.id, serviceId: svcExtCorrection.id,
      date: '2026-04-08', time: '11:00',
      status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.UNPAID,
    },
  })
  const b6 = await prisma.booking.create({
    data: {
      masterId: master.id, clientId: client2.id, serviceId: svcManicureGel.id,
      date: '2026-04-10', time: '13:00',
      status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.UNPAID,
    },
  })
  const b7 = await prisma.booking.create({
    data: {
      masterId: master.id, clientId: client3.id, serviceId: svcPedicureSpa.id,
      date: '2026-04-15', time: '15:00',
      status: BookingStatus.PENDING, paymentStatus: PaymentStatus.UNPAID,
      notes: 'Прошу напомнить за день',
    },
  })

  // ── 7. Платежи ───────────────────────────────────────────────────────────
  console.log('\n💳 Создаю платежи...')
  await prisma.payment.create({
    data: { bookingId: b1.id, amount: 315000, method: PaymentMethod.CARD, status: PaymentStatus.PAID }, // 3500 - 10%
  })
  await prisma.payment.create({
    data: { bookingId: b2.id, amount: 600000, method: PaymentMethod.VK_PAY, status: PaymentStatus.PAID },
  })
  await prisma.payment.create({
    data: { bookingId: b3.id, amount: 100000, method: PaymentMethod.CARD, status: PaymentStatus.DEPOSIT_PAID },
  })
  await prisma.payment.create({
    data: { bookingId: b4.id, amount: 200000, method: PaymentMethod.CARD, status: PaymentStatus.PAID }, // 2500 - 20%
  })

  // ── 8. Отзывы ────────────────────────────────────────────────────────────
  console.log('\n⭐ Создаю отзывы...')
  await prisma.review.create({
    data: {
      masterId: master.id, clientId: client1.id, bookingId: b1.id,
      rating: 5,
      text: 'Виктория — мастер своего дела! Делала маникюр с гель-лаком, продержался больше 3 недель без сколов. Уже записалась снова на коррекцию.',
    },
  })
  await prisma.review.create({
    data: {
      masterId: master.id, clientId: client2.id, bookingId: b2.id,
      rating: 5,
      text: 'Наращивание на высшем уровне. Ногти выглядят натурально, очень аккуратно. Мастер предложила форму, которая мне идеально подошла. Рекомендую!',
    },
  })
  await prisma.review.create({
    data: {
      masterId: master.id, clientId: client3.id, bookingId: b3.id,
      rating: 5,
      text: 'Педикюр с гель-лаком — всё идеально. Мягкие пяточки, красивое покрытие. Приятная атмосфера и чистота. 5 звёзд без колебаний.',
    },
  })
  await prisma.review.create({
    data: {
      masterId: master.id, clientId: client4.id, bookingId: b4.id,
      rating: 5,
      text: 'Дизайн ногтей просто сказка! Сделала маникюр с фольгой и стразами на выпускной дочери — все в восторге. Виктория очень внимательна к деталям.',
    },
  })

  // ── 9. Пересчёт рейтинга ─────────────────────────────────────────────────
  const agg = await prisma.review.aggregate({
    where: { masterId: master.id },
    _avg: { rating: true },
  })
  await prisma.master.update({
    where: { id: master.id },
    data: { rating: agg._avg.rating ?? 4.9 },
  })

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║                      ✅ Готово!                               ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log(`\n  Мастер: ${master.name} (id=${master.id})`)
  console.log(`  Ссылка: https://max.ru/id9706002253_bot?startapp=${master.id}`)
  console.log(`  Категорий: 4`)
  console.log(`  Услуг: 12`)
  console.log(`  Клиентов: 4`)
  console.log(`  Записей: 7`)
  console.log(`  Отзывов: 4`)
  console.log(`  Рейтинг: ${agg._avg.rating?.toFixed(1)}`)
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
