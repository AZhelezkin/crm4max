import type { SubscriptionState } from '@/api/subscription.api'

export function createSubscriptionState(
  overrides: Partial<SubscriptionState> = {},
): SubscriptionState {
  const base: SubscriptionState = {
    status: 'ACTIVE',
    trialEndsAt: null,
    currentPeriodEnd: '2026-08-19T00:00:00.000Z',
    graceEndsAt: null,
    cardPan: '2200 **** **** 0000',
    lastChargeError: null,
    hasAccess: true,
    onlineBookingAvailable: true,
    // В прошлом: детект «оплата не прошла» сравнивает с моментом открытия формы.
    updatedAt: '2026-07-01T00:00:00.000Z',
    plannedPeriod: 'MONTH',
    ...overrides,
  }
  // Если тест задал статус/сроки, но не задал onlineBookingAvailable явно —
  // выводим его по той же логике, что бэкенд (isOnlineBookingAvailable).
  if (overrides.onlineBookingAvailable === undefined) {
    const now = Date.now()
    base.onlineBookingAvailable =
      base.status === 'ACTIVE'
      || (base.status === 'TRIALING' && !!base.trialEndsAt && new Date(base.trialEndsAt).getTime() > now)
      || (base.status === 'GRACE' && base.currentPeriodEnd != null)
  }
  return base
}
