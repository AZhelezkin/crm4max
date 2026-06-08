import { api } from './client'
import type { Payment } from '@/types'

export const paymentsApi = {
  list: () =>
    api.get<Payment[]>('/payments').then((r) => r.data),

  // date (YYYY-MM-DD) — детализация только за этот день; без даты — все оплаты.
  // С датой шлём tzOffset (минуты getTimezoneOffset для этого дня — учитывает DST),
  // чтобы сервер вырезал тот же локальный день, что показан на экране.
  exportXlsx: (date?: string) => {
    const config = date
      ? { params: { date, tzOffset: new Date(`${date}T12:00:00`).getTimezoneOffset() } }
      : undefined
    return api
      .get<{ url: string; filename: string }>('/payments/export', config)
      .then((r) => r.data)
  },
}
