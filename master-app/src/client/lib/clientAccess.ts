import { mastersApi, type ClientAccessResponse } from '@client/api/masters.api'

export const CLIENT_BLOCKED_BY_MASTER = 'CLIENT_BLOCKED_BY_MASTER'

export type ClientAccessOutcome = 'allowed' | 'blocked' | 'unavailable'

const PENDING_RETRY_DELAY_MS = 250
const MAX_PENDING_ATTEMPTS = 24

function waitForPendingDelivery() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, PENDING_RETRY_DELAY_MS))
}

function deliveryCompleted(access: ClientAccessResponse) {
  return access.access === 'blocked'
    && (access.delivery === 'sent' || access.delivery === 'already_sent')
}

async function requestClientAccess(masterId: string) {
  for (let attempt = 0; attempt < MAX_PENDING_ATTEMPTS; attempt += 1) {
    const access = await mastersApi.checkClientAccess(masterId)
    if (access.access !== 'blocked' || access.delivery !== 'pending') return access
    if (attempt === MAX_PENDING_ATTEMPTS - 1) break
    await waitForPendingDelivery()
  }
  throw new Error('client access delivery is still pending')
}

/** Проверяет доступ; side effect закрытия выполняет только всё ещё активный экран. */
export async function checkClientAccess(masterId: string): Promise<ClientAccessOutcome> {
  try {
    const access = await requestClientAccess(masterId)
    if (access.access === 'allowed') return 'allowed'
    if (deliveryCompleted(access)) return 'blocked'
    return 'unavailable'
  } catch {
    return 'unavailable'
  }
}

export function isClientBlockedByMasterError(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { error?: string } } })?.response
  return response?.status === 403 && response.data?.error === CLIENT_BLOCKED_BY_MASTER
}
