import axios from 'axios'

export const BOT_TOKEN = process.env.MAX_BOT_TOKEN!
export const BOT_API_URL = process.env.MAX_BOT_API_URL ?? 'https://botapi.max.ru'
export const BOT_NAME = process.env.MAX_BOT_NAME ?? 'id9706002253_bot'

export type BotButton = { type: string; text: string; url?: string; payload?: string }

export async function sendMessage(
  chatId: number,
  text: string,
  buttons?: BotButton[][],
  format?: 'markdown' | 'html',
) {
  const body: Record<string, unknown> = { text }
  if (format) body.format = format
  if (buttons) {
    body.attachments = [{ type: 'inline_keyboard', payload: { buttons } }]
  }
  await axios.post(`${BOT_API_URL}/messages`, body, {
    headers: { Authorization: BOT_TOKEN },
    params: { chat_id: chatId },
  }).catch((err) => console.error('Bot send error:', err.response?.data ?? err.message))
}
