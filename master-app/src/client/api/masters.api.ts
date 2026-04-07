import { api } from './client'
import type { Master } from '@client/types'

export const mastersApi = {
  getById: (id: string) =>
    api.get<Master>(`/masters/${id}`).then((r) => r.data),

  getSlots: (masterId: string, date: string, serviceId: string) =>
    api.get<string[]>(`/schedule/${masterId}/slots`, { params: { date, serviceId } }).then((r) => r.data),

  getAvailability: (masterId: string, from: string, to: string, serviceId: string) =>
    api.get<Record<string, boolean>>(`/schedule/${masterId}/availability`, { params: { from, to, serviceId } }).then((r) => r.data),
}
