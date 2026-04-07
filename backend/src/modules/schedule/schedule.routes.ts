import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requireOnboarded } from '../../middleware/auth.middleware'
import { scheduleService } from './schedule.service'

export async function scheduleRoutes(app: FastifyInstance) {
  // GET /api/schedule/me — получить график мастера
  app.get('/me', { preHandler: requireOnboarded }, async (req, reply) => {
    const { userId } = req.user as { userId: string }
    return reply.send(await scheduleService.get(userId))
  })

  // PUT /api/schedule/me — обновить график
  app.put('/me', { preHandler: authenticate }, async (req, reply) => {
    const schema = z.object({
      workingDays: z.array(z.number().int().min(1).max(7)),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      breakStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      breakEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      bufferMinutes: z.number().int().min(0).default(0),
    })
    const { userId } = req.user as { userId: string }
    const data = schema.parse(req.body)
    return reply.send(await scheduleService.upsert(userId, data))
  })

  // GET /api/schedule/:masterId/slots?date=2025-03-25&serviceId=xxx
  // Публичный — для клиента
  app.get('/:masterId/slots', async (req, reply) => {
    const { masterId } = req.params as { masterId: string }
    const { date, serviceId } = req.query as { date: string; serviceId: string }
    const slots = await scheduleService.getAvailableSlots(masterId, date, serviceId)
    return reply.send(slots)
  })

  // GET /api/schedule/:masterId/availability?from=2026-04-08&to=2026-06-30&serviceId=xxx
  // Публичный — batch-проверка наличия слотов по диапазону дат
  app.get('/:masterId/availability', async (req, reply) => {
    const { masterId } = req.params as { masterId: string }
    const { from, to, serviceId } = req.query as { from: string; to: string; serviceId: string }
    const availability = await scheduleService.getAvailability(masterId, from, to, serviceId)
    return reply.send(availability)
  })
}
