/**
 * seed-demo-master.mjs — plain ESM, запускается внутри backend-контейнера:
 *
 *   # Копируем на сервер и в контейнер:
 *   scp -i ~/.ssh/crm4max_deploy scripts/seed-demo-master.mjs ubuntu@158.160.244.151:/tmp/
 *   CONTAINER=$(ssh -i ~/.ssh/crm4max_deploy ubuntu@158.160.244.151 \
 *     "docker ps --format '{{.Names}}' | grep backend")
 *   ssh -i ~/.ssh/crm4max_deploy ubuntu@158.160.244.151 \
 *     "docker cp /tmp/seed-demo-master.mjs $CONTAINER:/app/ && \
 *      docker exec $CONTAINER sh -c 'cd /app && node seed-demo-master.mjs'"
 */

import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { deflateSync } from 'zlib'

const { BookingStatus, PaymentStatus, PaymentMethod } = {
  BookingStatus: { PENDING: 'PENDING', CONFIRMED: 'CONFIRMED', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' },
  PaymentStatus:  { UNPAID: 'UNPAID', DEPOSIT_PAID: 'DEPOSIT_PAID', PAID: 'PAID' },
  PaymentMethod:  { CARD: 'CARD', VK_PAY: 'VK_PAY' },
}

const prisma = new PrismaClient()

const S3_BUCKET   = process.env.S3_BUCKET   ?? 'crm4max-media'
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'https://storage.yandexcloud.net'
const S3_ACCESS   = process.env.S3_ACCESS_KEY ?? ''
const S3_SECRET   = process.env.S3_SECRET_KEY ?? ''

const s3 = new S3Client({
  region: 'ru-central1',
  endpoint: S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: S3_ACCESS, secretAccessKey: S3_SECRET },
})

function publicUrl(key) {
  return `https://storage.yandexcloud.net/${S3_BUCKET}/${key}`
}

// ─── Генерация PNG из цвета (чистый Node.js, без внешних пакетов) ────────────

function u32be(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b }

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBytes, data])
  return Buffer.concat([u32be(data.length), typeBytes, data, u32be(crc32(crcInput))])
}

/**
 * Создаёт PNG-изображение заданного цвета размером w×h пикселей.
 * Опционально можно задать второй цвет для простого градиента (чередование строк).
 */
function makePng(r, g, b, r2 = r, g2 = g, b2 = b, w = 300, h = 200) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrData = Buffer.concat([u32be(w), u32be(h), Buffer.from([8, 2, 0, 0, 0])])
  const ihdr = pngChunk('IHDR', ihdrData)

  const rowSize = 1 + w * 3
  const raw = Buffer.alloc(h * rowSize)
  for (let y = 0; y < h; y++) {
    // Плавный переход от цвета 1 к цвету 2 по вертикали
    const t = y / (h - 1)
    const cr = Math.round(r + (r2 - r) * t)
    const cg = Math.round(g + (g2 - g) * t)
    const cb = Math.round(b + (b2 - b) * t)
    raw[y * rowSize] = 0 // filter: None
    for (let x = 0; x < w; x++) {
      const o = y * rowSize + 1 + x * 3
      raw[o] = cr; raw[o + 1] = cg; raw[o + 2] = cb
    }
  }

  const idat = pngChunk('IDAT', deflateSync(raw))
  const iend = pngChunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, ihdr, idat, iend])
}

async function uploadPng(buf, folder) {
  const key = `${folder}/${randomUUID()}.png`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buf,
    ContentType: 'image/png',
  }))
  const result = publicUrl(key)
  console.log(`  ✓ ${result.slice(0, 80)}`)
  return result
}

async function main() {
  console.log('\n════ Виктория Лебедева — демо-мастер (nail art, Москва) ════\n')

  // ── Фото мастера ─────────────────────────────────────────────────────────
  console.log('📸 Фото мастера...')
  const masterPhotoUrl = await uploadPng(makePng(255, 220, 185, 255, 195, 160, 300, 300), 'avatars')


  // ── Мастер ───────────────────────────────────────────────────────────────
  console.log('\n👤 Создаю мастера...')
  const master = await prisma.master.upsert({
    where: { maxUserId: '100003' },
    update: { photo: masterPhotoUrl, isOnboarded: true },
    create: {
      maxUserId:   '100003',
      firstName:   'Виктория',
      lastName:    'Лебедева',
      name:        'Виктория Лебедева',
      photo:       masterPhotoUrl,
      description: 'Мастер ногтевого сервиса с 6-летним опытом в Москве. Специализируюсь на маникюре, педикюре, наращивании и nail-арте. Работаю только с сертифицированными материалами брендов Kodi, Irisk, E.Mi.',
      contacts:    'Тел: +7 916 234-56-78\nInstagram: @vika_nails_msk',
      location:    'Москва, Патриаршие пруды, Малая Бронная улица, 20',
      lat:         55.7635,
      lng:         37.5948,
      rating:      4.9,
      isOnboarded: true,
    },
  })
  console.log(`  ✓ ${master.name}  id=${master.id}`)

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

  // ── Очистка старых данных (безопасно при повторном запуске) ──────────────
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
  // ── Категория 1: Маникюр ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n💅 Категория: Маникюр')
  const catM = await prisma.category.create({
    data: { masterId: master.id, name: 'Маникюр', description: 'Классический и аппаратный маникюр, покрытие' },
  })

  const svcM1 = await prisma.service.create({ data: {
    masterId: master.id, categoryId: catM.id,
    name: 'Маникюр классический', durationMin: 60, price: 250000,
    description: 'Обрезной маникюр + уход за кутикулой',
  }})
  const svcM2 = await prisma.service.create({ data: {
    masterId: master.id, categoryId: catM.id,
    name: 'Маникюр аппаратный', durationMin: 75, price: 300000,
    description: 'Аппаратный маникюр без срезания кутикулы, щадящий метод',
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

  console.log('  📷 Фото работ...')
  // Маникюр: розово-персиковые оттенки
  const manicurePalette = [[255,182,193],[255,160,180],[245,150,168],[235,140,155]]
  for (let i = 0; i < 4; i++) {
    const [r,g,b] = manicurePalette[i]
    const url = await uploadPng(makePng(r, g, b, r-30, g-20, b-20), 'work')
    await prisma.servicePhoto.create({ data: { serviceId: svcM3.id, url, order: i } })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Категория 2: Педикюр ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🦶 Категория: Педикюр')
  const catP = await prisma.category.create({
    data: { masterId: master.id, name: 'Педикюр', description: 'Аппаратный и SPA-педикюр' },
  })

  const svcP1 = await prisma.service.create({ data: {
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

  console.log('  📷 Фото работ...')
  // Педикюр: лавандово-сиреневые оттенки
  const pedicurePalette = [[220,208,255],[200,185,245]]
  for (let i = 0; i < 2; i++) {
    const [r,g,b] = pedicurePalette[i]
    const url = await uploadPng(makePng(r, g, b, r-25, g-20, b-20), 'work')
    await prisma.servicePhoto.create({ data: { serviceId: svcP2.id, url, order: i } })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Категория 3: Наращивание ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n💎 Категория: Наращивание ногтей')
  const catE = await prisma.category.create({
    data: { masterId: master.id, name: 'Наращивание', description: 'Гелевое наращивание на типсы и формы' },
  })

  const svcE1 = await prisma.service.create({ data: {
    masterId: master.id, categoryId: catE.id,
    name: 'Наращивание гелем (типсы)', durationMin: 150, durationMax: 180, price: 600000,
    description: 'Наращивание + придание формы + выравнивание + финиш + дизайн по желанию',
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

  console.log('  📷 Фото работ...')
  // Наращивание: нюдово-бежевые оттенки
  const extPalette = [[245,225,200],[235,210,185]]
  for (let i = 0; i < 2; i++) {
    const [r,g,b] = extPalette[i]
    const url = await uploadPng(makePng(r, g, b, r-20, g-15, b-10), 'work')
    await prisma.servicePhoto.create({ data: { serviceId: svcE1.id, url, order: i } })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Категория 4: Дизайн ──────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🎨 Категория: Дизайн ногтей')
  const catD = await prisma.category.create({
    data: { masterId: master.id, name: 'Дизайн ногтей', description: 'Nail-арт, стемпинг, фольга, стразы, роспись' },
  })

  const svcD1 = await prisma.service.create({ data: {
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
    description: 'Классический или цветной «лунный» и »трёхцветный» французский маникюр',
  }})

  console.log('  📷 Фото работ...')
  // Дизайн: кораллово-красные оттенки
  const nailArtPalette = [[255,120,100],[240,100,130],[220,80,110]]
  for (let i = 0; i < 3; i++) {
    const [r,g,b] = nailArtPalette[i]
    const url = await uploadPng(makePng(r, g, b, r-30, g-20, b-15), 'work')
    await prisma.servicePhoto.create({ data: { serviceId: svcD2.id, url, order: i } })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Клиенты ──────────────────────────────────────────────────────────────
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
  // ── Записи ───────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📅 Записи...')
  const b1 = await prisma.booking.create({ data: {
    masterId: master.id, clientId: c1.id, serviceId: svcM3.id,
    date: '2026-03-05', time: '11:00', status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.PAID,
  }})
  const b2 = await prisma.booking.create({ data: {
    masterId: master.id, clientId: c2.id, serviceId: svcE1.id,
    date: '2026-03-12', time: '12:00', status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.PAID,
  }})
  const b3 = await prisma.booking.create({ data: {
    masterId: master.id, clientId: c3.id, serviceId: svcP2.id,
    date: '2026-03-20', time: '14:00', status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.DEPOSIT_PAID, depositAmount: 100000,
  }})
  const b4 = await prisma.booking.create({ data: {
    masterId: master.id, clientId: c4.id, serviceId: svcD2.id,
    date: '2026-03-28', time: '16:00', status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.PAID,
  }})
  await prisma.booking.create({ data: {
    masterId: master.id, clientId: c1.id, serviceId: svcE2.id,
    date: '2026-04-08', time: '11:00', status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.UNPAID,
  }})
  await prisma.booking.create({ data: {
    masterId: master.id, clientId: c2.id, serviceId: svcM3.id,
    date: '2026-04-10', time: '13:00', status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.UNPAID,
  }})
  await prisma.booking.create({ data: {
    masterId: master.id, clientId: c3.id, serviceId: svcP3.id,
    date: '2026-04-15', time: '15:00', status: BookingStatus.PENDING, paymentStatus: PaymentStatus.UNPAID,
    notes: 'Прошу напомнить за день',
  }})

  // ── Платежи ───────────────────────────────────────────────────────────────
  console.log('\n💳 Платежи...')
  await prisma.payment.create({ data: { bookingId: b1.id, amount: 315000, method: PaymentMethod.CARD,   status: PaymentStatus.PAID } })
  await prisma.payment.create({ data: { bookingId: b2.id, amount: 600000, method: PaymentMethod.VK_PAY, status: PaymentStatus.PAID } })
  await prisma.payment.create({ data: { bookingId: b3.id, amount: 100000, method: PaymentMethod.CARD,   status: PaymentStatus.DEPOSIT_PAID } })
  await prisma.payment.create({ data: { bookingId: b4.id, amount: 200000, method: PaymentMethod.CARD,   status: PaymentStatus.PAID } })

  // ── Отзывы ────────────────────────────────────────────────────────────────
  console.log('\n⭐ Отзывы...')
  await prisma.review.create({ data: {
    masterId: master.id, clientId: c1.id, bookingId: b1.id, rating: 5,
    text: 'Виктория — мастер своего дела! Делала маникюр с гель-лаком, продержался больше 3 недель без сколов. Уже записалась снова на коррекцию.',
  }})
  await prisma.review.create({ data: {
    masterId: master.id, clientId: c2.id, bookingId: b2.id, rating: 5,
    text: 'Наращивание на высшем уровне. Ногти выглядят натурально, очень аккуратно. Мастер предложила форму, которая идеально подошла. Рекомендую!',
  }})
  await prisma.review.create({ data: {
    masterId: master.id, clientId: c3.id, bookingId: b3.id, rating: 5,
    text: 'Педикюр с гель-лаком — всё идеально. Мягкие пяточки, красивое покрытие. Чистота, профессионализм. 5 звёзд без колебаний.',
  }})
  await prisma.review.create({ data: {
    masterId: master.id, clientId: c4.id, bookingId: b4.id, rating: 5,
    text: 'Дизайн ногтей просто сказка! Сделала маникюр с фольгой и стразами — все в восторге. Виктория очень внимательна к деталям.',
  }})

  // ── Пересчёт рейтинга ─────────────────────────────────────────────────────
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
  .catch((e) => { console.error('❌', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
