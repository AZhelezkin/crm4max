import type { SubscriptionState } from '@/api/subscription.api'

export function createSubscriptionState(
  overrides: Partial<SubscriptionState> = {},
): SubscriptionState {
  return {
    status: 'ACTIVE',
    trialEndsAt: null,
    currentPeriodEnd: '2026-08-19T00:00:00.000Z',
    graceEndsAt: null,
    cardPan: '2200 **** **** 0000',
    lastChargeError: null,
    hasAccess: true,
    ...overrides,
  }
}
