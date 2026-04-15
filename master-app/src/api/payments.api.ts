import { api } from './client'
import type { Payment } from '@/types'

export const paymentsApi = {
  list: () =>
    api.get<Payment[]>('/payments').then((r) => r.data),

  exportXlsx: () =>
    api
      .get<{ url: string; filename: string }>('/payments/export')
      .then((r) => r.data),
}
