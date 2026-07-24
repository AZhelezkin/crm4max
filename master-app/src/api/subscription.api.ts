import { api } from './client'

export interface SubscriptionState {
  status: 'TRIALING' | 'ACTIVE' | 'GRACE' | 'BLOCKED'
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  graceEndsAt: string | null
  cardPan: string | null
  lastChargeError: string | null
  hasAccess: boolean
  /** Доступна ли клиентам онлайн-запись (кабинет мастера не блокируется никогда). */
  onlineBookingAvailable: boolean
  /** Последнее обновление подписки на бэке — для детекта «оплата не прошла». */
  updatedAt: string
}

export const subscriptionApi = {
  // «Попробовать бесплатно 7 дней»: привязка карты (без списания) + старт триала.
  // Привязка карты без списания + сохранение периода для пост-триального списания.
  startTrial: (period: 'MONTH' | 'YEAR' = 'MONTH') =>
    api.post<{ paymentURL: string }>('/subscription/trial', { period }).then((r) => r.data),
  // Оплата подписки (баннер/блокировка/«Подключить»): месяц 499 ₽ / год 4 790 ₽.
  pay: (period: 'MONTH' | 'YEAR' = 'MONTH') =>
    api.post<{ paymentURL: string }>('/subscription/pay', { period }).then((r) => r.data),
  // «Способы оплаты» → «Изменить карту»: hosted-форма перепривязки (0 ₽ + 3DS).
  rebindCard: () =>
    api.post<{ paymentURL: string }>('/subscription/rebind-card').then((r) => r.data),
  // Текущее состояние подписки мастера.
  getMe: () => api.get<SubscriptionState | null>('/subscription/me').then((r) => r.data),
}
