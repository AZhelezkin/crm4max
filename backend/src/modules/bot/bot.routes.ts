import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import axios from 'axios'
import { prisma } from '../../db/client'
import { transcribeAudio } from '../../lib/speechkit'
import {
  handleBookingMessage,
  confirmBooking,
  deleteSession,
  resetToCollecting,
  getSession,
  changeTime,
  changeDay,
  changeService,
} from '../../lib/booking-agent'
import {
  sendMessage,
  tokenFor,
  BOT_API_URL,
  BOT_NAME_MASTER,
  BOT_NAME_CLIENT,
  type BotRole,
} from '../../lib/bot-messaging'
import { sendChatwootSupportMessage } from '../../lib/chatwoot'
import { awaitingSupport, resolveMaxUser, SUPPORT_PROMPT } from '../support/support.routes'

const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

/** Регистрирует список команд для бота нужной роли. PATCH /me — идемпотентный. */
async function registerCommandsFor(role: BotRole) {
  const token = tokenFor(role)
  if (!token) return
  const commands = [
    { name: '/support', description: 'Связаться с поддержкой' },
  ]
  await axios.patch(
    `${BOT_API_URL}/me`,
    { commands },
    { headers: { Authorization: token } },
  ).catch((err) => console.error(`Bot (${role}) register commands error:`, err.response?.data ?? err.message))
}

/** Регистрирует команды у обоих ботов (master + client). Вызывается при старте бэка. */
export async function registerBotCommands() {
  await Promise.all([registerCommandsFor('master'), registerCommandsFor('client')])
}

// ── Welcome-сообщения ──────────────────────────────────────────────────────────

// Клиент-бот: без masterId → режим сканирования QR.
// Mini-app зарегистрирован только у мастер-бота, поэтому все клиентские кнопки
// «открыть приложение» ведут на master-бот через ?startapp= (там App.tsx сам
// разрулит в client-режим по start_param).
async function sendWelcomeClientQR(chatId: number) {
  await sendMessage(
    'client',
    chatId,
    'Привет! 👋\n\nЯ помогу тебе записаться к твоему любимому мастеру прямо в Максе. А также напомню о твоих записях.',
    [[{ type: 'link', text: 'Продолжить', url: `https://max.ru/${BOT_NAME_MASTER}?startapp=qr` }]],
  )
}

// Клиент-бот: с masterId → запись к конкретному мастеру
async function sendWelcomeClientWithMaster(chatId: number, masterId: string) {
  await sendMessage(
    'client',
    chatId,
    'Привет! 👋\n\nТы переходишь к мастеру. Нажми кнопку ниже чтобы открыть карточку и записаться.',
    [[{ type: 'link', text: '📅 Записаться', url: `https://max.ru/${BOT_NAME_MASTER}?startapp=${masterId}` }]],
  )
}

// Мастер-бот: кабинет мастера
async function sendWelcomeMaster(chatId: number) {
  await sendMessage(
    'master',
    chatId,
    'Привет! 👋\n\nЭто бот CRMax. Для регистрации или входа в свой кабинет нажми кнопку.',
    [[{ type: 'link', text: '👨‍💼 Открыть кабинет', url: `https://max.ru/${BOT_NAME_MASTER}?startapp=mmode` }]],
  )
}

// Кросс-перенаправления: написал не туда.
async function sendMasterEnteredClientBot(chatId: number) {
  await sendMessage(
    'client',
    chatId,
    'Этот бот — для клиентов мастеров. Ваш кабинет мастера находится в другом боте.',
    [[{ type: 'link', text: '👨‍💼 Открыть кабинет мастера', url: `https://max.ru/${BOT_NAME_MASTER}?startapp=mmode` }]],
  )
}

async function sendClientEnteredMasterBot(chatId: number) {
  await sendMessage(
    'master',
    chatId,
    'Этот бот — для мастеров. Чтобы записаться к мастеру, откройте клиентский бот.',
    [[{ type: 'link', text: '📅 Бот для записи', url: `https://max.ru/${BOT_NAME_CLIENT}` }]],
  )
}

// UIKit демо — примеры всех UI-элементов бота
async function sendUIKitDemo(role: BotRole, chatId: number) {
  // 1. Форматирование текста (markdown)
  await sendMessage(role, chatId,
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
  await sendMessage(role, chatId,
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
  // Mini-app зарегистрирован только у мастер-бота, поэтому open_app в любом
  // боте указывает на BOT_NAME_MASTER. Для клиента — без mmode (клиентский режим).
  const openAppUrl = role === 'master'
    ? `https://max.ru/${BOT_NAME_MASTER}?startapp=mmode`
    : `https://max.ru/${BOT_NAME_MASTER}?startapp=qr`
  await sendMessage(role, chatId,
    '— 3. Типы кнопок (inline keyboard) —',
    [
      [{ type: 'callback', text: '🔘 Callback', payload: 'uikit_callback_demo' }],
      [{ type: 'link', text: '🔗 Link (открыть URL)', url: 'https://dev.max.ru' }],
      [{ type: 'request_contact', text: '📱 Запросить контакт' }],
      [{ type: 'request_geo_location', text: '📍 Запросить геолокацию' }],
      [{ type: 'open_app', text: '📲 Открыть мини-приложение', url: openAppUrl }],
      [{ type: 'clipboard', text: '📋 Копировать текст', payload: 'Скопированный текст из UIKit демо' }],
    ],
  )

  // 4. Несколько кнопок в одном ряду
  await sendMessage(role, chatId,
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

  // 5. Интерактивное меню
  await sendMessage(role, chatId,
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

// ── Универсальный обработчик webhook для конкретной роли бота ────────────────

async function handleWebhook(role: BotRole, req: FastifyRequest, reply: FastifyReply) {
  const update = req.body as any
  req.log.info({ role, update }, 'bot webhook received')

  // bot_started — клиент или мастер запустил бот
  if (update?.update_type === 'bot_started') {
    const chatId: number = update.chat_id
    const userId: string = String(update.user_id ?? update.user?.user_id ?? '')
    const payload: string = update.payload ?? ''

    if (!chatId || !userId) return reply.status(200).send({ ok: true })

    const isMaster = await prisma.master.findUnique({
      where: { maxUserId: userId },
      select: { id: true },
    })

    if (role === 'master') {
      if (!isMaster) {
        // Клиент пришёл в мастерский бот → перенаправляем в клиентский.
        await sendClientEnteredMasterBot(chatId)
        return reply.status(200).send({ ok: true })
      }
      await prisma.creatorMaster.update({
        where: { maxUserId: userId },
        data: { chatId: String(chatId) },
      }).catch(() => {})
      if (payload === 'support') {
        awaitingSupport.add(chatId)
        await sendMessage('master', chatId, SUPPORT_PROMPT)
      } else {
        await sendWelcomeMaster(chatId)
      }
    } else {
      // role === 'client'
      if (isMaster) {
        // Мастер пришёл в клиентский бот → перенаправляем в мастерский.
        await sendMasterEnteredClientBot(chatId)
        return reply.status(200).send({ ok: true })
      }
      await prisma.client.upsert({
        where: { maxUserId: userId },
        update: { chatId: String(chatId) },
        create: { maxUserId: userId, name: update.user?.name ?? 'Клиент', chatId: String(chatId) },
      }).catch(() => {})
      if (payload === 'support') {
        awaitingSupport.add(chatId)
        await sendMessage('client', chatId, SUPPORT_PROMPT)
      } else if (isUUID(payload)) {
        await sendWelcomeClientWithMaster(chatId, payload)
      } else {
        await sendWelcomeClientQR(chatId)
      }
    }
  }

  // Обработка текстовых сообщений и голосовых
  if (update?.update_type === 'message_created') {
    const text = (update.message?.message?.text ?? update.text ?? '').trim()
    const chatId: number = update.message?.recipient?.chat_id
    const maxUserId: string = String(update.message?.sender?.user_id ?? update.sender?.user_id ?? '')
    const attachments: any[] = update.message?.message?.attachments ?? update.attachments ?? []

    if (!chatId) return reply.status(200).send({ ok: true })

    req.log.info({
      event: 'bot.message_in',
      role,
      chatId,
      maxUserId,
      text: text.length > 200 ? text.slice(0, 200) + '…' : text,
      attachmentTypes: attachments.map((a: any) => a?.type).filter(Boolean),
    }, 'bot message received')

    // Хелпер: отправить ответ агента + залогировать reply.
    const sendAgentReply = async (
      result: {
        replyText: string
        confirmButtons?: boolean
        confirmPayload?: string
        buttons?: { text: string; payload: string }[]
        done?: boolean
      },
      format?: 'markdown' | 'html',
    ) => {
      req.log.info({
        event: 'bot.reply_out',
        role,
        chatId,
        replyText: result.replyText.length > 200 ? result.replyText.slice(0, 200) + '…' : result.replyText,
        hasConfirm: !!result.confirmButtons,
        extraButtons: result.buttons?.length ?? 0,
        done: !!result.done,
        format,
      }, 'bot reply')
      let buttons: { type: 'callback'; text: string; payload: string }[][] | undefined
      if (result.confirmButtons && result.confirmPayload) {
        buttons = [[{ type: 'callback', text: 'Записать', payload: result.confirmPayload }]]
      } else if (result.buttons?.length) {
        buttons = result.buttons.map(b => [{ type: 'callback', text: b.text, payload: b.payload }])
      }
      await sendMessage(role, chatId, result.replyText, buttons, format)
    }

    // /support — в обоих ботах
    if (/^\/?support(@[^\s]+)?$/i.test(text)) {
      awaitingSupport.add(chatId)
      await sendMessage(role, chatId, SUPPORT_PROMPT)
      return reply.status(200).send({ ok: true })
    }

    if (/^uikit$/i.test(text)) {
      await sendUIKitDemo(role, chatId)
      return reply.status(200).send({ ok: true })
    }

    if (/^\/?cancel$/i.test(text)) {
      await deleteSession(chatId)
      await sendMessage(role, chatId, '❌ Запись отменена.')
      return reply.status(200).send({ ok: true })
    }

    // Поддержка: ждём описание тикета → шлём в Chatwoot
    if (awaitingSupport.has(chatId) && text && !text.startsWith('/')) {
      awaitingSupport.delete(chatId)
      const senderUserId = String(update.message?.sender?.user_id ?? '')
      const { displayName } = await resolveMaxUser(senderUserId)
      const userIdNum = Number(senderUserId)
      if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
        req.log.warn({ event: 'support.bad_user_id', senderUserId }, 'cannot parse maxUserId')
        await sendMessage(role, chatId, '⚠️ Не удалось определить пользователя. Попробуйте позже.')
        return reply.status(200).send({ ok: true })
      }
      const cw = await sendChatwootSupportMessage(userIdNum, displayName, text)
      req.log.info({
        event: 'support.chatwoot_send',
        role,
        chatId,
        userId: userIdNum,
        ok: cw.ok,
        conversationId: cw.conversationId,
        messageId: cw.messageId,
        error: cw.error,
      }, 'support message forwarded to chatwoot')
      if (cw.ok) {
        await sendMessage(role, chatId, '✅ Спасибо! Ваше обращение зарегистрировано. Мы скоро свяжемся.')
      } else {
        await sendMessage(role, chatId, '⚠️ Не удалось отправить обращение. Попробуйте позже через кнопку «Поддержка».')
      }
      return reply.status(200).send({ ok: true })
    }

    // Booking agent — только в клиент-боте: записи делают клиенты.
    if (role === 'client') {
      const audioAttachment = attachments.find((a: any) => a?.type === 'audio')
      if (audioAttachment) {
        req.log.info({ audioPayload: audioAttachment.payload }, 'bot: audio received, transcribing')
        let transcript: string | null = null
        try {
          transcript = await transcribeAudio(audioAttachment.payload.url)
          req.log.info({ transcript }, 'bot: transcription result')
        } catch (err: any) {
          req.log.error({ err: err.response?.data ?? err.message }, 'bot: transcription error')
          await sendMessage('client', chatId, '🎤 Не смог распознать голосовое, попробуйте ещё раз или напишите текстом.')
          return reply.status(200).send({ ok: true })
        }

        if (!transcript) {
          await sendMessage('client', chatId, '🎤 Не удалось распознать речь. Попробуйте написать текстом.')
          return reply.status(200).send({ ok: true })
        }

        const result = await handleBookingMessage(chatId, maxUserId, transcript, req.log.child({ component: 'booking-agent', chatId }))
        await sendAgentReply(result)
        return reply.status(200).send({ ok: true })
      }

      const session = await getSession(chatId)
      if (session && text) {
        const result = await handleBookingMessage(chatId, maxUserId, text, req.log.child({ component: 'booking-agent', chatId }))
        await sendAgentReply(result)
        return reply.status(200).send({ ok: true })
      }

      if (/^\/?book$/i.test(text)) {
        const result = await handleBookingMessage(chatId, maxUserId, '', req.log.child({ component: 'booking-agent', chatId }))
        await sendAgentReply(result, 'markdown')
        return reply.status(200).send({ ok: true })
      }
    }
  }

  // Обработка нажатий callback-кнопок
  if (update?.update_type === 'message_callback') {
    const chatId: number = update.message?.recipient?.chat_id
    const payload: string = update.callback?.payload ?? ''

    if (chatId && payload === 'booking_cancel') {
      await resetToCollecting(chatId)
      await sendMessage(role, chatId,
        '↩️ Хорошо, начнём заново. Что хотите записать? Скажите или напишите услугу, дату и время.',
      )
      return reply.status(200).send({ ok: true })
    }

    if (chatId && payload === 'booking_change_time') {
      const result = await changeTime(chatId)
      await sendMessage(role, chatId, result.replyText)
      return reply.status(200).send({ ok: true })
    }
    if (chatId && payload === 'booking_change_day') {
      const result = await changeDay(chatId)
      await sendMessage(role, chatId, result.replyText)
      return reply.status(200).send({ ok: true })
    }
    if (chatId && payload === 'booking_change_service') {
      const result = await changeService(chatId)
      await sendMessage(role, chatId, result.replyText)
      return reply.status(200).send({ ok: true })
    }
    if (chatId && payload === 'booking_cancel_all') {
      await deleteSession(chatId)
      await sendMessage(role, chatId, '❌ Запись отменена.')
      return reply.status(200).send({ ok: true })
    }

    if (chatId && payload.startsWith('{"action":"booking_confirm"')) {
      try {
        const data = JSON.parse(payload)
        const result = await confirmBooking(chatId, data)
        if (!result.ok) {
          await sendMessage(role, chatId, `⚠️ ${result.error}`)
        }
      } catch {
        await sendMessage(role, chatId, '⚠️ Ошибка при создании записи. Попробуйте снова.')
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
        await sendMessage(role, chatId,
          `${label}\n\nВыбрать дату и время?`,
          [
            [
              { type: 'callback', text: '📅 Выбрать дату', payload: 'uikit_date' },
              { type: 'callback', text: '↩️ Назад к меню', payload: 'uikit_back_menu' },
            ],
          ],
        )
      } else {
        await sendMessage(role, chatId, `✅ Callback получен!\n\nPayload: \`${payload}\``, undefined, 'markdown')
      }
    }
  }

  return reply.status(200).send({ ok: true })
}

export async function botRoutes(app: FastifyInstance) {
  // Раздельные webhook'и для двух ботов. Конфигурируются в кабинете Max:
  //   master-бот → POST {PUBLIC_API_URL}/api/bot/master/webhook
  //   client-бот → POST {PUBLIC_API_URL}/api/bot/client/webhook
  // Старый /api/bot/webhook оставлен как алиас на master-бот, чтобы не уронить
  // существующую конфигурацию до перенастройки в Max.
  const webhookGuard = async (req: FastifyRequest, reply: FastifyReply) => {
    const secret = req.headers['x-max-bot-api-secret']
    if (process.env.BOT_WEBHOOK_SECRET && secret !== process.env.BOT_WEBHOOK_SECRET) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
  }

  app.post('/master/webhook', { preHandler: webhookGuard }, async (req, reply) => {
    return handleWebhook('master', req, reply)
  })

  app.post('/client/webhook', { preHandler: webhookGuard }, async (req, reply) => {
    return handleWebhook('client', req, reply)
  })

  // Legacy-алиас: пока Max-кабинет не перенастроен, старый webhook продолжает работать
  // как мастерский (там был основной сценарий мастеров). После перенастройки — удалить.
  app.post('/webhook', { preHandler: webhookGuard }, async (req, reply) => {
    return handleWebhook('master', req, reply)
  })
}
