/**
 * seed-demo-db.mjs — Шаг 2 из 2: запускается НА СЕРВЕРЕ.
 * Только DB-операции, без скачивания фото. Использует уже загруженные в S3 URL.
 *
 *   docker cp seed-demo-db.mjs crm4max-backend:/app/
 *   docker exec crm4max-backend sh -c 'cd /app && node seed-demo-db.mjs'
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const { PENDING, CONFIRMED, COMPLETED } = { PENDING:'PENDING', CONFIRMED:'CONFIRMED', COMPLETED:'COMPLETED' }
const { UNPAID, DEPOSIT_PAID, PAID }     = { UNPAID:'UNPAID', DEPOSIT_PAID:'DEPOSIT_PAID', PAID:'PAID' }
const { CARD, VK_PAY }                   = { CARD:'CARD', VK_PAY:'VK_PAY' }

// ─── S3-URL загруженных фото ───────────────────────────────────────────────────

const PHOTOS = {
  master: 'https://storage.yandexcloud.net/crm4max-media/avatars/16c8e1b2-4643-4340-a5b8-d7b778b45684.jpg',
  manicure: [
    'https://storage.yandexcloud.net/crm4max-media/work/42c5d993-c08d-48a2-9c38-10464ba290de.jpg',
    'https://storage.yandexcloud.net/crm4max-media/work/941bc1b4-5fb7-482f-a707-6cd53e706d74.jpg',
    'https://storage.yandexcloud.net/crm4max-media/work/c85128c3-6715-4d02-b6c3-9cd7ae9b2da1.jpg',
    'https://storage.yandexcloud.net/crm4max-media/work/b95bc61e-6239-4040-9efc-17c33f22b2ad.jpg',
  ],
  pedicure: [
    'https://storage.yandexcloud.net/crm4max-media/work/f75b70c6-041f-4243-9a6e-c45e90c1782d.jpg',
    'https://storage.yandexcloud.net/crm4max-media/work/b56e1a27-50aa-4512-8571-7853a3f7f139.jpg',
  ],
  extensions: [
    'https://storage.yandexcloud.net/crm4max-media/work/fdf1dc1c-8000-4a25-9102-ec05cddbca27.jpg',
    'https://storage.yandexcloud.net/crm4max-media/work/a78ae65d-a806-4e61-ace6-ee0eabfb6fa4.jpg',
  ],
  nailart: [
    'https://storage.yandexcloud.net/crm4max-media/work/69411e09-0130-4a20-a92e-700589be0ce6.jpg',
    'https://storage.yandexcloud.net/crm4max-media/work/b1991273-13e7-4801-a8f3-86b04ab5a1b0.jpg',
    'https://storage.yandexcloud.net/crm4max-media/work/70aeb1b9-737a-4d13-b64a-48b4f7b05be3.jpg',
  ],
}

async function main() {
  console.log('\n════ Виктория Лебедева — создание записей в БД ════\n')

  // ── Мастер ───────────────────────────────────────────────────────────────
  const master = await prisma.master.upsert({
    where: { maxUserId: '100003' },
    update: { photo: PHOTOS.master, isOnboarded: true },
    create: {
      maxUserId:   '100003',
      firstName:   'Виктория',
      lastName:    'Лебедева',
      name:        'Виктория Лебедева',
      photo:       PHOTOS.master,
      description: 'Мастер ногтевого сервиса с 6-летним опытом в Москве. Специализируюсь на маникюре, педикюре, наращивании и nail-арте. Работаю только с сертифицированными материалами брендов Kodi, Irisk, E.Mi.',
      contacts:    'Тел: +7 916 234-56-78\nInstagram: @vika_nails_msk',
      location:    'Москва, Патриаршие пруды, Малая Бронная улица, 20',
      lat:         55.7635,
      lng:         37.5948,
      rating:      4.9,
      isOnboarded: true,
    },
  })
  console.log(`  ✓ Мастер: ${master.name}  id=${master.id}`)

  // ── График ───────────────────────────────────────────────────────────────
  await prisma.schedule.upsert({
    where:  { masterId: master.id },
    update: {},
    create: {
      masterId:      master.id,
      workingDays:   [1, 2, 3, 4, 5, 6],
      startTime:     '10:00',
      endTime:       '21:00',
      breakStart:    '14:00',
      breakEnd:      '15:00',
      bufferMinutes: 10,
    },
  })
  console.log('  ✓ График: Пн–Сб 10:00–21:00')

  // ── Очистка старых данных (идемпотентность) ───────────────────────────────
  const oldBks = await prisma.booking.findMany({ where: { masterId: master.id }, select: { id: true } })
  for (const bk of oldBks) {
    await prisma.review.deleteMany({ where: { bookingId: bk.id } })
    await prisma.payment.deleteMany({ where: { bookingId: bk.id } })
  }
  await prisma.booking.deleteMany({ where: { masterId: master.id } })
  const oldSvcs = await prisma.service.findMany({ where: { masterId: master.id }, select: { id: true } })
  for (const s of oldSvcs) await prisma.servicePhoto.deleteMany({ where: { serviceId: s.id } })
  await prisma.service.deleteMany({ where: { masterId: master.id } })
  await prisma.category.deleteMany({ where: { masterId: master.id } })

  // ═══════════════════════════════════════════════════════════════════════════
  // Категория 1: Маникюр
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n💅 Маникюр...')
  const catM = await prisma.category.create({
    data: { masterId: master.id, name: 'Маникюр', description: 'Классический и аппаратный маникюр, покрытие' },
  })
  await prisma.service.create({ data: {
    masterId: master.id, categoryId: catM.id,
    name: 'Маникюр классический', durationMin: 60, price: 250000,
    description: 'Обрезной маникюр + уход за кутикулой',
  }})
  await prisma.service.create({ data: {
    masterId: master.id, categoryId: catM.id,
    name: 'Маникюр аппаратный', durationMin: 75, price: 300000,
    description: 'Аппаратный маникюр без срезания кутикулы',
  }})
  const svcM3 = await prisma.service.create({ data: {
    masterId: master.id, categoryId: catM.id,
    name: 'Маникюр + покрытие гель-лаком', durationMin: 90, price: 350000,
    discountPercent: 10,
    description: 'Аппаратный маникюр + цветное покрытие гель-лаком (300+ цветов)',
  }})
  await prisma.service.create({ data: {
    masterId: master.id, categoryId: catM.id,
    name: 'Снятие гель-лака', durationMin: 20, price: 80000,
  }})
  for (let i = 0; i < PHOTOS.manicure.length; i++) {
    await prisma.servicePhoto.create({ data: { serviceId: svcM3.id, url: PHOTOS.manicure[i], order: i } })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Категория 2: Педикюр
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🦶 Педикюр...')
  const catP = await prisma.category.create({
    data: { masterId: master.id, name: 'Педикюр', description: 'Аппаратный и SPA-педикюр' },
  })
  await prisma.service.create({ data: {
    masterId: master.id, categoryId: catP.id,
    name: 'Педикюр аппаратный', durationMin: 75, price: 350000,
    description: 'Обработка стоп + уход за кутикулой аппаратным методом',
  }})
  const svcP2 = await prisma.service.create({ data: {
    masterId: master.id, categoryId: catP.id,
    name: 'Педикюр + покрытие гель-лаком', durationMin: 100, price: 450000,
    discountPercent: 15,
    description: 'Полный аппаратный педикюр + стойкое покрытие гель-лаком',
  }})
  const svcP3 = await prisma.service.create({ data: {
    masterId: master.id, categoryId: catP.id,
    name: 'SPA-педикюр', durationMin: 120, price: 600000,
    description: 'Педикюр + парафинотерапия + расслабляющий массаж стоп',
  }})
  for (let i = 0; i < PHOTOS.pedicure.length; i++) {
    await prisma.servicePhoto.create({ data: { serviceId: svcP2.id, url: PHOTOS.pedicure[i], order: i } })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Категория 3: Наращивание
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('💎 Наращивание...')
  const catE = await prisma.category.create({
    data: { masterId: master.id, name: 'Наращивание', description: 'Гелевое наращивание на типсы и формы' },
  })
  const svcE1 = await prisma.service.create({ data: {
    masterId: master.id, categoryId: catE.id,
    name: 'Наращивание гелем (типсы)', durationMin: 150, durationMax: 180, price: 600000,
    description: 'Наращивание + форма + выравнивание + финиш + дизайн по желанию',
  }})
  const svcE2 = await prisma.service.create({ data: {
    masterId: master.id, categoryId: catE.id,
    name: 'Коррекция наращивания', durationMin: 90, durationMax: 120, price: 400000,
    description: 'Коррекция отросшей базы + шлифовка + выравнивание',
  }})
  await prisma.service.create({ data: {
    masterId: master.id, categoryId: catE.id,
    name: 'Снятие наращивания', durationMin: 45, price: 150000,
  }})
  for (let i = 0; i < PHOTOS.extensions.length; i++) {
    await prisma.servicePhoto.create({ data: { serviceId: svcE1.id, url: PHOTOS.extensions[i], order: i } })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Категория 4: Дизайн
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🎨 Дизайн ногтей...')
  const catD = await prisma.category.create({
    data: { masterId: master.id, name: 'Дизайн ногтей', description: 'Nail-арт, стемпинг, фольга, стразы, роспись' },
  })
  await prisma.service.create({ data: {
    masterId: master.id, categoryId: catD.id,
    name: 'Дизайн на 1 ноготь', durationMin: 10, price: 30000,
    description: 'Рисунок, стразы, фольга или стемпинг — на один ноготь',
  }})
  const svcD2 = await prisma.service.create({ data: {
    masterId: master.id, categoryId: catD.id,
    name: 'Дизайн «Все ногти»', durationMin: 60, durationMax: 90, price: 250000,
    discountPercent: 20,
    description: 'Nail-арт на все ногти: роспись гель-красками, стемпинг или фольга',
  }})
  await prisma.service.create({ data: {
    masterId: master.id, categoryId: catD.id,
    name: 'Французский маникюр (Френч)', durationMin: 30, price: 150000,
    description: 'Классический или цветной «лунный» и «трёхцветный» французский маникюр',
  }})
  for (let i = 0; i < PHOTOS.nailart.length; i++) {
    await prisma.servicePhoto.create({ data: { serviceId: svcD2.id, url: PHOTOS.nailart[i], order: i } })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Клиенты
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n👥 Клиенты...')
  const c1 = await prisma.client.upsert({ where: { vkUserId: '300001' }, update: {},
    create: { vkUserId: '300001', name: 'Ольга Николаева',    phone: '+7 916 300-11-22', photo: 'https://i.pravatar.cc/300?img=47' }})
  const c2 = await prisma.client.upsert({ where: { vkUserId: '300002' }, update: {},
    create: { vkUserId: '300002', name: 'Анастасия Громова',  phone: '+7 903 300-33-44', photo: 'https://i.pravatar.cc/300?img=56' }})
  const c3 = await prisma.client.upsert({ where: { vkUserId: '300003' }, update: {},
    create: { vkUserId: '300003', name: 'Дарья Фролова',      phone: '+7 925 300-55-66', photo: 'https://i.pravatar.cc/300?img=32' }})
  const c4 = await prisma.client.upsert({ where: { vkUserId: '300004' }, update: {},
    create: { vkUserId: '300004', name: 'Екатерина Морозова', phone: '+7 906 300-77-88', photo: 'https://i.pravatar.cc/300?img=48' }})

  // ═══════════════════════════════════════════════════════════════════════════
  // Записи
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📅 Записи...')
  const b1 = await prisma.booking.create({ data: {
    masterId: master.id, clientId: c1.id, serviceId: svcM3.id,
    date: '2026-03-05', time: '11:00', status: COMPLETED, paymentStatus: PAID,
  }})
  const b2 = await prisma.booking.create({ data: {
    masterId: master.id, clientId: c2.id, serviceId: svcE1.id,
    date: '2026-03-12', time: '12:00', status: COMPLETED, paymentStatus: PAID,
  }})
  const b3 = await prisma.booking.create({ data: {
    masterId: master.id, clientId: c3.id, serviceId: svcP2.id,
    date: '2026-03-20', time: '14:00', status: COMPLETED, paymentStatus: DEPOSIT_PAID, depositAmount: 100000,
  }})
  const b4 = await prisma.booking.create({ data: {
    masterId: master.id, clientId: c4.id, serviceId: svcD2.id,
    date: '2026-03-28', time: '16:00', status: COMPLETED, paymentStatus: PAID,
  }})
  await prisma.booking.create({ data: {
    masterId: master.id, clientId: c1.id, serviceId: svcE2.id,
    date: '2026-04-08', time: '11:00', status: CONFIRMED, paymentStatus: UNPAID,
  }})
  await prisma.booking.create({ data: {
    masterId: master.id, clientId: c2.id, serviceId: svcM3.id,
    date: '2026-04-10', time: '13:00', status: CONFIRMED, paymentStatus: UNPAID,
  }})
  await prisma.booking.create({ data: {
    masterId: master.id, clientId: c3.id, serviceId: svcP3.id,
    date: '2026-04-15', time: '15:00', status: PENDING, paymentStatus: UNPAID,
    notes: 'Прошу напомнить за день',
  }})

  // Платежи
  console.log('💳 Платежи...')
  await prisma.payment.create({ data: { bookingId: b1.id, amount: 315000, method: CARD,   status: PAID } })
  await prisma.payment.create({ data: { bookingId: b2.id, amount: 600000, method: VK_PAY, status: PAID } })
  await prisma.payment.create({ data: { bookingId: b3.id, amount: 100000, method: CARD,   status: DEPOSIT_PAID } })
  await prisma.payment.create({ data: { bookingId: b4.id, amount: 200000, method: CARD,   status: PAID } })

  // Отзывы
  console.log('⭐ Отзывы...')
  await prisma.review.create({ data: {
    masterId: master.id, clientId: c1.id, bookingId: b1.id, rating: 5,
    text: 'Виктория — мастер своего дела! Маникюр с гель-лаком продержался больше 3 недель без сколов. Уже записалась снова.',
  }})
  await prisma.review.create({ data: {
    masterId: master.id, clientId: c2.id, bookingId: b2.id, rating: 5,
    text: 'Наращивание на высшем уровне. Ногти выглядят натурально, очень аккуратно. Мастер предложила форму, которая идеально подошла. Рекомендую!',
  }})
  await prisma.review.create({ data: {
    masterId: master.id, clientId: c3.id, bookingId: b3.id, rating: 5,
    text: 'Педикюр с гель-лаком — всё идеально. Мягкие пяточки, красивое покрытие. Чистота, профессионализм. 5 звёзд!',
  }})
  await prisma.review.create({ data: {
    masterId: master.id, clientId: c4.id, bookingId: b4.id, rating: 5,
    text: 'Дизайн ногтей просто сказка! Маникюр с фольгой и стразами на выпускной — все в восторге. Виктория очень внимательна к деталям.',
  }})

  // Рейтинг
  const agg = await prisma.review.aggregate({ where: { masterId: master.id }, _avg: { rating: true } })
  await prisma.master.update({ where: { id: master.id }, data: { rating: agg._avg.rating ?? 4.9 } })

  console.log('\n════════════════════════════════════════════════════════')
  console.log('✅ Готово!')
  console.log(`   Мастер : ${master.name}`)
  console.log(`   ID     : ${master.id}`)
  console.log(`   Ссылка : https://max.ru/id9706002253_bot?startapp=${master.id}`)
  console.log(`   Рейтинг: ${agg._avg.rating?.toFixed(1)} ★`)
  console.log('════════════════════════════════════════════════════════\n')
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
