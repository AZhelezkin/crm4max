import axios from 'axios'

export type BotRole = 'master' | 'client'

export const BOT_API_URL = process.env.MAX_BOT_API_URL ?? 'https://botapi.max.ru'

// Раздельные токены и имена для мастер-бота и клиент-бота.
// MAX_BOT_TOKEN / MAX_BOT_NAME оставлены как legacy-fallback для обратной совместимости
// (если в окружении ещё не задано раздельных переменных) — это удобно на dev/CI до полного раската.
const LEGACY_BOT_TOKEN = process.env.MAX_BOT_TOKEN ?? ''
const LEGACY_BOT_NAME = process.env.MAX_BOT_NAME ?? 'id9706002253_bot'

export const BOT_TOKEN_MASTER = process.env.MAX_BOT_TOKEN_MASTER ?? LEGACY_BOT_TOKEN
export const BOT_TOKEN_CLIENT = process.env.MAX_BOT_TOKEN_CLIENT ?? LEGACY_BOT_TOKEN

export const BOT_NAME_MASTER = process.env.MAX_BOT_NAME_MASTER ?? LEGACY_BOT_NAME
export const BOT_NAME_CLIENT = process.env.MAX_BOT_NAME_CLIENT ?? 'id9706002253_1_bot'

/** Все токены, у которых не пустое значение — для проверки initData (verifyMaxInitData
 *  пробует подпись каждым в порядке, в котором они здесь перечислены). */
export const ALL_BOT_TOKENS: string[] = Array.from(
  new Set([BOT_TOKEN_MASTER, BOT_TOKEN_CLIENT, LEGACY_BOT_TOKEN].filter(Boolean)),
)

/** Legacy-экспорты: оставлены, чтобы не ломать места, которые ещё не разделены по ролям.
 *  Внутри проекта новый код должен использовать ботов явно: tokenFor(role)/nameFor(role). */
export const BOT_TOKEN = BOT_TOKEN_MASTER
export const BOT_NAME = BOT_NAME_MASTER

export function tokenFor(role: BotRole): string {
  return role === 'master' ? BOT_TOKEN_MASTER : BOT_TOKEN_CLIENT
}

export function nameFor(role: BotRole): string {
  return role === 'master' ? BOT_NAME_MASTER : BOT_NAME_CLIENT
}

export type BotButton = { type: string; text: string; url?: string; payload?: string }

/** Отправка сообщения через бота нужной роли. Если токен не задан — silent no-op. */
export async function sendMessage(
  role: BotRole,
  chatId: number,
  text: string,
  buttons?: BotButton[][],
  format?: 'markdown' | 'html',
) {
  const token = tokenFor(role)
  if (!token) return

  const body: Record<string, unknown> = { text }
  if (format) body.format = format
  if (buttons) {
    body.attachments = [{ type: 'inline_keyboard', payload: { buttons } }]
  }
  await axios.post(`${BOT_API_URL}/messages`, body, {
    headers: { Authorization: token },
    params: { chat_id: chatId },
  }).catch((err) => console.error(`Bot (${role}) send error:`, err.response?.data ?? err.message))
}
