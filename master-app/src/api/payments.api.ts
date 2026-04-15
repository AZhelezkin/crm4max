import { api } from './client'
import type { Payment } from '@/types'

export const paymentsApi = {
  list: () =>
    api.get<Payment[]>('/payments').then((r) => r.data),

  exportXlsx: () =>
    api
      .get<Blob>('/payments/export', { responseType: 'blob' })
      .then((r) => r.data),
}
