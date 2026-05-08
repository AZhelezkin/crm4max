import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../db/client'
import { authenticate } from '../../middleware/auth.middleware'
import { sendMessage, BOT_NAME } from '../../lib/bot-messaging'
import { verifyChatwootBearer } from '../../lib/chatwoot'

/** In-memory флаг «жду описание тикета поддержки» по chatId. Single-instance
 *  бэкенд, при рестарте сессия теряется (пользователь сможет /support снова).
 *  При горизонтальном масштабировании заменим на Redis. */
export const awaitingSupport = new Set<number>()

export interface MaxUserInfo {
  chatId: number | null
  displayName: string
}

/** Находит chatId и отображаемое имя пользователя Max по maxUserId.
 *  Ищет одновременно среди мастеров и клиентов. */
export async function resolveMaxUser(maxUserId: string): Promise<MaxUserInfo> {
  const master = await prisma.creatorMaster.findUnique({
    where: { maxUserId },
    select: { chatId: true, firstName: true, lastName: true, username: true },
  }).catch(() => null)
  if (master) {
    const name = [master.firstName, master.lastName].filter(Boolean).join(' ').trim()
      || master.username
      || 'Пользователь'
    return { chatId: master.chatId ? Number(master.chatId) : null, displayName: name }
  }

  const client = await prisma.client.findUnique({
    where: { maxUserId },
    select: { chatId: true, name: true },
  }).catch(() => null)
  if (client) {
    return { chatId: client.chatId ? Number(client.chatId) : null, displayName: client.name || 'Клиент' }
  }

  return { chatId: null, displayName: 'Пользователь' }
}

const SUPPORT_PROMPT = 'Опишите проблему в следующем сообщении — мы получим обращение и свяжемся с вами.'

export async function supportRoutes(app: FastifyInstance) {
  // ── POST /api/support/start — клиент дёргает из миниаппы ────────────────────
  app.post('/start', { onRequest: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user as { maxUserId: string; role: 'master' | 'client' }
    if (!user?.maxUserId) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const { chatId } = await resolveMaxUser(user.maxUserId)
    if (!chatId) {
      return reply.status(400).send({
        error: 'Бот не активирован. Откройте бот в Max и нажмите «Старт», затем повторите.',
      })
    }

    awaitingSupport.add(chatId)
    await sendMessage(chatId, SUPPORT_PROMPT)

    return { ok: true, botUrl: `https://max.ru/${BOT_NAME}` }
  })

  // ── POST /api/support/reply — callback от Chatwoot Gateway ──────────────────
  app.post('/reply', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!verifyChatwootBearer(req.headers.authorization)) {
      return reply.status(401).send({ status: 'error', reason: 'unauthorized' })
    }

    const body = req.body as { userId?: number; text?: string }
    const userIdNum = Number(body?.userId)
    const text = (body?.text ?? '').trim()
    if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
      return reply.status(400).send({ status: 'error', reason: 'userId required' })
    }
    if (!text) {
      return reply.status(400).send({ status: 'error', reason: 'text required' })
    }

    const { chatId } = await resolveMaxUser(String(userIdNum))
    if (!chatId) {
      req.log.warn({ event: 'support.reply.no_chat', userId: userIdNum }, 'no chatId for user, drop')
      // Возвращаем 200 чтобы Gateway не ретраил — пользователя нет в нашей БД.
      return { status: 'ok', delivered: false }
    }

    await sendMessage(chatId, text)
    req.log.info({ event: 'support.reply.delivered', chatId, userId: userIdNum, len: text.length }, 'support reply forwarded')
    return { status: 'ok', delivered: true }
  })
}
