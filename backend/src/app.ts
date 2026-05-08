import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'

import { authRoutes }         from './modules/auth/auth.routes'
import { masterRoutes }       from './modules/masters/masters.routes'
import { serviceRoutes }      from './modules/services/services.routes'
import { scheduleRoutes }     from './modules/schedule/schedule.routes'
import { bookingRoutes }      from './modules/bookings/bookings.routes'
import { paymentRoutes }      from './modules/payments/payments.routes'
import { notificationRoutes } from './modules/notifications/notifications.routes'
import { reviewRoutes }       from './modules/reviews/reviews.routes'
import { uploadRoutes }       from './modules/upload/upload.routes'
import { botRoutes, registerBotCommands } from './modules/bot/bot.routes'
import { supportRoutes } from './modules/support/support.routes'
import { registerChatwootCallback } from './lib/chatwoot'

async function main() {
  const app = Fastify({ logger: true })

  // ─── Plugins ──────────────────────────────────────────────────────────────────

  await app.register(cors, {
    origin: true,
    credentials: true,
  })

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'fallback-secret-change-in-production',
  })

  // Multipart для загрузки файлов (фото мастеров, категорий, услуг)
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 МБ
      files: 1,
    },
  })

  // ─── Routes ───────────────────────────────────────────────────────────────────

  await app.register(authRoutes,         { prefix: '/api/auth' })
  await app.register(masterRoutes,       { prefix: '/api/masters' })
  await app.register(serviceRoutes,      { prefix: '/api/services' })
  await app.register(scheduleRoutes,     { prefix: '/api/schedule' })
  await app.register(bookingRoutes,      { prefix: '/api/bookings' })
  await app.register(paymentRoutes,      { prefix: '/api/payments' })
  await app.register(notificationRoutes, { prefix: '/api/notifications' })
  await app.register(reviewRoutes,       { prefix: '/api/reviews' })
  await app.register(uploadRoutes,       { prefix: '/api/upload' })
  await app.register(botRoutes,          { prefix: '/api/bot' })
  await app.register(supportRoutes,      { prefix: '/api/support' })

  // ─── Health check ─────────────────────────────────────────────────────────────

  app.get('/health', async () => ({ status: 'ok' }))

  // ─── Start ────────────────────────────────────────────────────────────────────

  const PORT = Number(process.env.PORT) || 3000

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Server running on port ${PORT}`)
    // Идемпотентная регистрация списка команд бота. Не блокирует старт,
    // если Max API недоступен — просто логируем ошибку.
    registerBotCommands().catch((err) => console.error('registerBotCommands failed:', err))

    // Регистрируем callback URL в Chatwoot Gateway. По контракту gateway хранит
    // URL в runtime, поэтому при перезапуске бэка нужно перерегистрировать.
    if (process.env.CHATWOOT_GATEWAY_URL && process.env.PUBLIC_API_URL) {
      const callbackUrl = `${process.env.PUBLIC_API_URL.replace(/\/$/, '')}/api/support/reply`
      registerChatwootCallback(callbackUrl)
        .then((ok) => console.log(`Chatwoot callback ${ok ? 'registered' : 'NOT registered'}: ${callbackUrl}`))
        .catch((err) => console.error('registerChatwootCallback failed:', err))
    }
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
