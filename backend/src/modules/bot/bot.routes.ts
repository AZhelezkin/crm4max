import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { prisma } from '../../db/client'
import { transcribeAudio } from '../../lib/speechkit'
import {
  handleBookingMessage,
  confirmBooking,
  deleteSession,
  resetToCollecting,
  getSession,
} from '../../lib/booking-agent'
import { sendMessage, BOT_TOKEN, BOT_API_URL, BOT_NAME } from '../../lib/bot-messaging'
import { sendChatwootSupportMessage } from '../../lib/chatwoot'
import { awaitingSupport, resolveMaxUser } from '../support/support.routes'

const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

/** Регистрирует список команд, который Max показывает в UI бота
 *  (меню «/» в чате). PATCH /me — идемпотентный, можно дёргать на каждый
 *  старт бэкенда. Если token не задан — silent no-op. */
export async function registerBotCommands() {
  if (!BOT_TOKEN) return
  const commands = [
    { name: '/support', description: 'Связаться с поддержкой' },
  ]
  await axios.patch(
    `${BOT_API_URL}/me`,
    { commands },
    { headers: { Authorization: BOT_TOKEN } },
  ).catch((err) => console.error('Bot register commands error:', err.response?.data ?? err.message))
}

// Сценарий 1: клиент без мастера → режим сканирования QR
async function sendWelcomeClientQR(chatId: number) {
  await sendMessage(
    chatId,
    'Привет! 👋\n\nЯ помогу тебе записаться к твоему любимому мастеру прямо в Максе. А также напомню о твоих записях.',
    [[{ type: 'link', text: 'Продолжить', url: `https://max.ru/${BOT_NAME}?startapp=qr` }]]
  )
}

// Сценарий 2: клиент с masterId → запись к конкретному мастеру
async function sendWelcomeClientWithMaster(chatId: number, masterId: string) {
  await sendMessage(
    chatId,
    'Привет! 👋\n\nТы переходишь к мастеру. Нажми кнопку ниже чтобы открыть карточку и записаться.',
    [[{ type: 'link', text: '📅 Записаться', url: `https://max.ru/${BOT_NAME}?startapp=${masterId}` }]]
  )
}

// Сценарий 3: мастер → кабинет мастера
async function sendWelcomeMaster(chatId: number) {
  await sendMessage(
    chatId,
    'Привет! 👋\n\nЭто бот CRMax. Для регистрации или входа в свой кабинет нажми кнопку.',
    [[{ type: 'link', text: '👨‍💼 Открыть кабинет', url: `https://max.ru/${BOT_NAME}?startapp=mmode` }]]
  )
}

// UIKit демо — примеры всех UI-элементов бота
async function sendUIKitDemo(chatId: number) {
  // 1. Форматирование текста (markdown)
  await sendMessage(
    chatId,
    [
      '🎨 *UIKit — все UI-элементы бота Max*',
      '',
      '— *1. Форматирование текста (markdown)* —',
      '',
      '**Жирный текст**',
      '_Курсив_',
      '~Зачёркнутый~',
      '__Подчёркнутый__',
      '`Моноширинный код`',
      '[Ссылка в тексте](https://dev.max.ru)',
    ].join('\n'),
    undefined,
    'markdown',
  )

  // 2. Форматирование текста (HTML)
  await sendMessage(
    chatId,
    [
      '— <b>2. Форматирование текста (HTML)</b> —',
      '',
      '<b>Жирный</b>',
      '<i>Курсив</i>',
      '<s>Зачёркнутый</s>',
      '<u>Подчёркнутый</u>',
      '<code>Моноширинный код</code>',
      '<a href="https://dev.max.ru">Ссылка в тексте</a>',
    ].join('\n'),
    undefined,
    'html',
  )

  // 3. Все типы кнопок
  await sendMessage(
    chatId,
    '— 3. Типы кнопок (inline keyboard) —',
    [
      [{ type: 'callback', text: '🔘 Callback', payload: 'uikit_callback_demo' }],
      [{ type: 'link', text: '🔗 Link (открыть URL)', url: 'https://dev.max.ru' }],
      [{ type: 'request_contact', text: '📱 Запросить контакт' }],
      [{ type: 'request_geo_location', text: '📍 Запросить геолокацию' }],
      [{ type: 'open_app', text: '📲 Открыть мини-приложение', url: `https://max.ru/${BOT_NAME}?startapp=mmode` }],
      [{ type: 'clipboard', text: '📋 Копировать текст', payload: 'Скопированный текст из UIKit демо' }],
    ],
  )

  // 4. Несколько кнопок в одном ряду
  await sendMessage(
    chatId,
    '— 4. Несколько кнопок в ряду —',
    [
      [
        { type: 'callback', text: '1️⃣', payload: 'uikit_1' },
        { type: 'callback', text: '2️⃣', payload: 'uikit_2' },
        { type: 'callback', text: '3️⃣', payload: 'uikit_3' },
      ],
      [
        { type: 'callback', text: 'Да ✅', payload: 'uikit_yes' },
        { type: 'callback', text: 'Нет ❌', payload: 'uikit_no' },
      ],
    ],
  )

  // 5. ��нтерактивное меню — имитация реального бота
  await sendMessage(
    chatId,
    [
      '— *5. Inline-клавиатура: интерактивное меню* —',
      '',
      'Выберите услугу для записи:',
    ].join('\n'),
    [
      [
        { type: 'callback', text: '💇‍♀️ Стрижка', payload: 'uikit_menu_haircut' },
        { type: 'callback', text: '💅 Маникюр', payload: 'uikit_menu_nails' },
      ],
      [
        { type: 'callback', text: '💆‍♀️ Массаж', payload: 'uikit_menu_massage' },
        { type: 'callback', text: '🧖‍♀️ Уход за лицом', payload: 'uikit_menu_face' },
      ],
      [{ type: 'callback', text: '📋 Показать все услуги', payload: 'uikit_menu_all' }],
      [
        { type: 'callback', text: '◀️ Назад', payload: 'uikit_menu_back' },
        { type: 'callback', text: '🏠 Главная', payload: 'uikit_menu_home' },
        { type: 'callback', text: '▶️ Далее', payload: 'uikit_menu_next' },
      ],
    ],
    'markdown',
  )
}

export async function botRoutes(app: FastifyInstance) {
  app.post('/webhook', async (req, reply) => {
    const secret = req.headers['x-max-bot-api-secret']
    if (process.env.BOT_WEBHOOK_SECRET && secret !== process.env.BOT_WEBHOOK_SECRET) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const update = req.body as any
    req.log.info({ update }, 'bot webhook received')

    if (update?.update_type === 'bot_started') {
      const chatId: number = update.chat_id
      const userId: string = String(update.user_id ?? update.user?.user_id ?? '')
      const payload: string = update.payload ?? ''

      if (!chatId || !userId) return reply.status(200).send({ ok: true })

      // Определяем роль по БД, не по payload — payload приходит только из ?start=,
      // а ?startapp= (для мини-приложения) его не выставляет.
      const isMaster = await prisma.master.findUnique({
        where: { maxUserId: userId },
        select: { id: true },
      })

      if (isMaster) {
        // Сохраняем chatId мастера
        await prisma.creatorMaster.update({
          where: { maxUserId: userId },
          data: { chatId: String(chatId) },
        }).catch(() => {})
        if (payload === 'support') {
          awaitingSupport.add(chatId)
          await sendMessage(chatId, 'Опишите проблему в следующем сообщении — мы получим обращение и свяжемся с вами.')
        } else {
          await sendWelcomeMaster(chatId)
        }
      } else {
        // Сохраняем chatId клиента (upsert на случай если клиент новый)
        await prisma.client.upsert({
          where: { maxUserId: userId },
          update: { chatId: String(chatId) },
          create: { maxUserId: userId, name: update.user?.name ?? 'Клиент', chatId: String(chatId) },
        }).catch(() => {})
        if (payload === 'support') {
          awaitingSupport.add(chatId)
          await sendMessage(chatId, 'Опишите проблему в следующем сообщении — мы получим обращение и свяжемся с вами.')
        } else if (isUUID(payload)) {
          await sendWelcomeClientWithMaster(chatId, payload)
        } else {
          await sendWelcomeClientQR(chatId)
        }
      }
    }

    // Обработка текстовых сообщений и голосовых
    if (update?.update_type === 'message_created') {
      // Поля лежат в update.message.message.* (не в .body.*) и дублируются на верхнем уровне
      const text = (update.message?.message?.text ?? update.text ?? '').trim()
      const chatId: number = update.message?.recipient?.chat_id
      const maxUserId: string = String(update.message?.sender?.user_id ?? update.sender?.user_id ?? '')
      const attachments: any[] = update.message?.message?.attachments ?? update.attachments ?? []

      if (!chatId) return reply.status(200).send({ ok: true })

      req.log.info({
        event: 'bot.message_in',
        chatId,
        maxUserId,
        text: text.length > 200 ? text.slice(0, 200) + '…' : text,
        attachmentTypes: attachments.map((a: any) => a?.type).filter(Boolean),
      }, 'bot message received')

      // Хелпер: отправить ответ агента + залогировать reply.
      const sendAgentReply = async (
        result: { replyText: string; confirmButtons?: boolean; confirmPayload?: string; done?: boolean },
        format?: 'markdown' | 'html',
      ) => {
        req.log.info({
          event: 'bot.reply_out',
          chatId,
          replyText: result.replyText.length > 200 ? result.replyText.slice(0, 200) + '…' : result.replyText,
          hasButtons: !!result.confirmButtons,
          done: !!result.done,
          format,
        }, 'bot reply')
        const buttons = result.confirmButtons && result.confirmPayload
          ? [[{ type: 'callback', text: 'Записать', payload: result.confirmPayload }]]
          : undefined
        await sendMessage(chatId, result.replyText, buttons, format)
      }

      // ── /support ──────────────────────────────────────────────────────────
      if (/^\/?support(@[^\s]+)?$/i.test(text)) {
        awaitingSupport.add(chatId)
        await sendMessage(chatId, 'Опишите проблему в следующем сообщении — мы получим обращение и свяжемся с вами.')
        return reply.status(200).send({ ok: true })
      }

      if (/^uikit$/i.test(text)) {
        await sendUIKitDemo(chatId)
        return reply.status(200).send({ ok: true })
      }

      // /cancel — сброс активной booking-сессии
      if (/^\/?cancel$/i.test(text)) {
        await deleteSession(chatId)
        await sendMessage(chatId, '❌ Запись отменена.')
        return reply.status(200).send({ ok: true })
      }

      // ── Поддержка: ждём описание тикета → шлём в Chatwoot ────────────────
      if (awaitingSupport.has(chatId) && text && !text.startsWith('/')) {
        awaitingSupport.delete(chatId)
        const senderUserId = String(update.message?.sender?.user_id ?? '')
        const { displayName } = await resolveMaxUser(senderUserId)
        const userIdNum = Number(senderUserId)
        if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
          req.log.warn({ event: 'support.bad_user_id', senderUserId }, 'cannot parse maxUserId')
          await sendMessage(chatId, '⚠️ Не удалось определить пользователя. Попробуйте позже.')
          return reply.status(200).send({ ok: true })
        }
        const cw = await sendChatwootSupportMessage(userIdNum, displayName, text)
        req.log.info({
          event: 'support.chatwoot_send',
          chatId,
          userId: userIdNum,
          ok: cw.ok,
          conversationId: cw.conversationId,
          messageId: cw.messageId,
          error: cw.error,
        }, 'support message forwarded to chatwoot')
        if (cw.ok) {
          await sendMessage(chatId, '✅ Спасибо! Ваше обращение зарегистрировано. Мы скоро свяжемся.')
        } else {
          // Возвращаем флаг, чтобы пользователь мог переотправить
          awaitingSupport.add(chatId)
          await sendMessage(chatId, '⚠️ Не удалось отправить обращение. Попробуйте описать проблему ещё раз.')
        }
        return reply.status(200).send({ ok: true })
      }

      // ── Голосовое сообщение → транскрибация → booking agent ──────────────
      const audioAttachment = attachments.find((a: any) => a?.type === 'audio')
      if (audioAttachment) {
        req.log.info({ audioPayload: audioAttachment.payload }, 'bot: audio received, transcribing')
        let transcript: string | null = null
        try {
          transcript = await transcribeAudio(audioAttachment.payload.url)
          req.log.info({ transcript }, 'bot: transcription result')
        } catch (err: any) {
          req.log.error({ err: err.response?.data ?? err.message }, 'bot: transcription error')
          await sendMessage(chatId, '🎤 Не смог распознать голосовое, попробуйте ещё раз или напишите текстом.')
          return reply.status(200).send({ ok: true })
        }

        if (!transcript) {
          await sendMessage(chatId, '🎤 Не удалось распознать речь. Попробуйте написать текстом.')
          return reply.status(200).send({ ok: true })
        }

        // Передаём транскрипт в booking agent (так же как текстовое)
        const result = await handleBookingMessage(chatId, maxUserId, transcript, req.log.child({ component: 'booking-agent', chatId }))
        await sendAgentReply(result)
        return reply.status(200).send({ ok: true })
      }

      // ── Текстовое сообщение → booking agent (если есть активная сессия) ─
      const session = await getSession(chatId)
      if (session && text) {
        const result = await handleBookingMessage(chatId, maxUserId, text, req.log.child({ component: 'booking-agent', chatId }))
        await sendAgentReply(result)
        return reply.status(200).send({ ok: true })
      }

      // ── /book — явный старт записи голосом ───────────────────────────────
      if (/^\/?book$/i.test(text)) {
        const result = await handleBookingMessage(chatId, maxUserId, '', req.log.child({ component: 'booking-agent', chatId }))
        await sendAgentReply(result, 'markdown')
        return reply.status(200).send({ ok: true })
      }
    }

    // Обработка нажатий callback-кнопок
    if (update?.update_type === 'message_callback') {
      const chatId: number = update.message?.recipient?.chat_id
      const payload: string = update.callback?.payload ?? ''

      // Подтверждение/отмена записи
      if (chatId && payload === 'booking_cancel') {
        await resetToCollecting(chatId)
        await sendMessage(
          chatId,
          '↩️ Хорошо, начнём заново. Что хотите записать? Скажите или напишите услугу, дату и время.',
        )
        return reply.status(200).send({ ok: true })
      }

      if (chatId && payload.startsWith('{"action":"booking_confirm"')) {
        try {
          const data = JSON.parse(payload)
          const result = await confirmBooking(chatId, data)
          if (!result.ok) {
            await sendMessage(chatId, `⚠️ ${result.error}`)
          }
        } catch {
          await sendMessage(chatId, '⚠️ Ошибка при создании записи. Попробуйте снова.')
        }
        return reply.status(200).send({ ok: true })
      }

      if (chatId && payload.startsWith('uikit_')) {
        const menuLabels: Record<string, string> = {
          uikit_menu_haircut: '💇‍♀️ Стрижка — от 1 500 ₽, 45 мин',
          uikit_menu_nails: '💅 Маникюр — от 2 000 ₽, 60 мин',
          uikit_menu_massage: '💆‍♀️ Массаж — от 3 000 ₽, 90 мин',
          uikit_menu_face: '🧖‍♀️ Уход за лицом — от 2 500 ₽, 60 мин',
          uikit_menu_all: '📋 Всего доступно 12 услуг в 4 категориях',
          uikit_menu_back: '◀️ Возврат к предыдущему шагу',
          uikit_menu_home: '🏠 Возврат на главную',
          uikit_menu_next: '▶️ Переход к следующему шагу',
        }
        const label = menuLabels[payload]
        if (label) {
          await sendMessage(
            chatId,
            `${label}\n\nВыбрать дату и время?`,
            [
              [
                { type: 'callback', text: '📅 Выбрать дату', payload: 'uikit_date' },
                { type: 'callback', text: '↩️ Назад к меню', payload: 'uikit_back_menu' },
              ],
            ],
          )
        } else {
          await sendMessage(chatId, `✅ Callback получен!\n\nPayload: \`${payload}\``, undefined, 'markdown')
        }
      }
    }

    return reply.status(200).send({ ok: true })
  })
}
