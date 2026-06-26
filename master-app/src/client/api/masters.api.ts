import { api } from './client'
import type { Master } from '@client/types'
import { deviceTz } from '@client/lib/timezone'

/** Слот в поясе клиента: time — локальное время клиента; masterDate/masterTime —
 *  каноническая дата/время мастера (их и отправляем при записи). */
export interface ClientSlot {
  time: string
  masterDate: string
  masterTime: string
}

export const mastersApi = {
  getById: (id: string) =>
    api.get<Master>(`/masters/${id}`).then((r) => r.data),

  // tz=пояс клиента → бэкенд возвращает слоты в его поясе (объекты ClientSlot),
  // date трактуется как дата в поясе клиента.
  getSlots: (masterId: string, date: string, serviceId: string) =>
    api.get<ClientSlot[]>(`/schedule/${masterId}/slots`, { params: { date, serviceId, tz: deviceTz() } }).then((r) => r.data),

  getAvailability: (masterId: string, from: string, to: string, serviceId: string) =>
    api.get<Record<string, boolean>>(`/schedule/${masterId}/availability`, { params: { from, to, serviceId, tz: deviceTz() } }).then((r) => r.data),
}
