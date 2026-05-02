import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requireOnboarded } from '../../middleware/auth.middleware'
import { mastersService } from './masters.service'

export async function masterRoutes(app: FastifyInstance) {
  // GET /api/masters/:id — публичная карточка мастера (для клиента)
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const master = await mastersService.getPublicProfile(id)
    return reply.send(master)
  })

  // GET /api/masters/me — личный кабинет мастера
  app.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const master = await mastersService.getProfile(userId)
    return reply.send(master)
  })

  // PUT /api/masters/me — обновить профиль
  app.put('/me', { preHandler: authenticate }, async (req, reply) => {
    const schema = z.object({
      name: z.string().optional(),
      photo: z.string().optional(),
      description: z.string().optional(),
      contacts: z.string().optional(),
      phone: z.string().optional(),
      location: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      homeVisit: z.boolean().optional(),
      isOnboarded: z.boolean().optional(),
    })
    const { userId } = req.user as { userId: string }
    const data = schema.parse(req.body)

    if (data.isOnboarded === true) {
      const readiness = await mastersService.getOnboardingReadiness(userId)
      if (!readiness.isReady) {
        return reply.status(400).send({
          error: 'Onboarding is incomplete',
          missing: readiness.missing,
        })
      }
    }

    const master = await mastersService.updateProfile(userId, data)
    return reply.send(master)
  })

  // PUT /api/masters/me/payment — привязать карту / VK Pay
  app.put('/me/payment', { preHandler: requireOnboarded }, async (req, reply) => {
    const schema = z.object({
      cardNumber: z.string().optional(),
      vkPayLinked: z.boolean().optional(),
    })
    const { userId } = req.user as { userId: string }
    const data = schema.parse(req.body)
    const master = await mastersService.updatePayment(userId, data)
    return reply.send(master)
  })
}
