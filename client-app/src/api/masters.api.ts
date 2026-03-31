import { api } from './client'
import type { Master } from '@/types'

export const mastersApi = {
  getById: (id: string) =>
    api.get<Master>(`/masters/${id}`).then((r) => r.data),

  getSlots: (masterId: string, date: string, serviceId: string) =>
    api.get<string[]>(`/schedule/${masterId}/slots`, { params: { date, serviceId } }).then((r) => r.data),
}
