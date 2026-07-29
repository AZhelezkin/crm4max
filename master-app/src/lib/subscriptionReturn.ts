const RETURN_TO_KEY = 'subscription.returnTo'
const BOOKING_DRAFT_KEY = 'subscription.bookingDraft'
const MAX_AGE_MS = 60 * 60_000

type StoredValue<T> = { createdAt: number; value: T }

function read<T>(key: string): T | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(key) ?? 'null') as StoredValue<T> | null
    const age = stored ? Date.now() - stored.createdAt : -1
    if (!stored || !Number.isFinite(stored.createdAt) || age < 0 || age > MAX_AGE_MS) return null
    return stored.value
  } catch {
    return null
  }
}

function write<T>(key: string, value: T): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify({ createdAt: Date.now(), value }))
    return true
  } catch {
    return false
  }
}

export function rememberBookingReturn<T>(masterId: string, draft: T) {
  clearSubscriptionReturn()
  if (!write(BOOKING_DRAFT_KEY, { masterId, draft }) || !write(RETURN_TO_KEY, '/bookings/new')) {
    abandonSubscriptionReturn()
  }
}

export function readSubscriptionReturn(): string | null {
  return read<string>(RETURN_TO_KEY) === '/bookings/new' ? '/bookings/new' : null
}

export function clearSubscriptionReturn() {
  try { sessionStorage.removeItem(RETURN_TO_KEY) } catch { /* storage недоступен */ }
}

export function abandonSubscriptionReturn() {
  clearSubscriptionReturn()
  clearBookingDraft()
}

export function readBookingDraft<T>(masterId?: string): T | null {
  if (!masterId) return null
  const stored = read<{ masterId: string; draft: T }>(BOOKING_DRAFT_KEY)
  return stored?.masterId === masterId ? stored.draft : null
}

export function clearBookingDraft() {
  try { sessionStorage.removeItem(BOOKING_DRAFT_KEY) } catch { /* storage недоступен */ }
}
