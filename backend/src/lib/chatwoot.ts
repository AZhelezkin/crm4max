import axios from 'axios'

const GATEWAY_URL = (process.env.CHATWOOT_GATEWAY_URL ?? '').replace(/\/$/, '')
const GATEWAY_SECRET = process.env.CHATWOOT_GATEWAY_SECRET ?? ''

export interface ChatwootSendResult {
  ok: boolean
  conversationId?: number
  messageId?: number
  error?: string
}

/** Отправляет сообщение пользователя в Chatwoot через MAX↔Chatwoot Gateway.
 *  userId — стабильный ID пользователя MAX (число), userName — отображаемое имя. */
export async function sendChatwootSupportMessage(
  userId: number,
  userName: string,
  text: string,
): Promise<ChatwootSendResult> {
  if (!GATEWAY_URL || !GATEWAY_SECRET) {
    return { ok: false, error: 'gateway not configured' }
  }
  try {
    const r = await axios.post(
      `${GATEWAY_URL}/support/message`,
      { userId, userName, text },
      {
        headers: {
          Authorization: `Bearer ${GATEWAY_SECRET}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      },
    )
    return {
      ok: true,
      conversationId: r.data?.conversationId,
      messageId: r.data?.messageId,
    }
  } catch (err: any) {
    return {
      ok: false,
      error: err.response?.data?.reason ?? err.message ?? 'unknown',
    }
  }
}

/** Регистрирует callback-URL в Gateway. Дёргается на старте бэкенда. */
export async function registerChatwootCallback(callbackUrl: string): Promise<boolean> {
  if (!GATEWAY_URL || !GATEWAY_SECRET) return false
  try {
    await axios.post(
      `${GATEWAY_URL}/support/register-callback`,
      { callbackUrl },
      {
        headers: {
          Authorization: `Bearer ${GATEWAY_SECRET}`,
          'Content-Type': 'application/json',
        },
        timeout: 5_000,
      },
    )
    return true
  } catch {
    return false
  }
}

/** Проверяет Bearer-токен в заголовке Authorization для входящих callback-ов. */
export function verifyChatwootBearer(authHeader: string | undefined): boolean {
  if (!GATEWAY_SECRET) return false
  if (!authHeader) return false
  const m = /^Bearer\s+(.+)$/i.exec(authHeader)
  if (!m) return false
  return m[1] === GATEWAY_SECRET
}
