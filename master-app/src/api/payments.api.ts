import { api } from './client'
import type { Payment } from '@/types'

export const paymentsApi = {
  list: () =>
    api.get<Payment[]>('/payments').then((r) => r.data),

  // date (YYYY-MM-DD) — детализация только за этот день; без даты — все оплаты.
  exportXlsx: (date?: string) =>
    api
      .get<{ url: string; filename: string }>('/payments/export', date ? { params: { date } } : undefined)
      .then((r) => r.data),
}
