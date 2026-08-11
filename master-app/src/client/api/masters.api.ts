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

/** Карточка мастера в списке последних (страница выбора из бота). */
export interface RecentMaster {
  id: string
  name: string
  photo: string | null
  description: string | null
}

export interface MasterAddressDetails {
  location: string | null
  locationNote: string | null
  lat: number | null
  lng: number | null
}

export type ClientAccessResponse =
  | { access: 'allowed' }
  | {
      access: 'blocked'
      delivery: 'sent' | 'already_sent' | 'pending'
    }

export const mastersApi = {
  checkClientAccess: (id: string) =>
    api.post<ClientAccessResponse>(`/masters/${id}/client-access`).then((r) => r.data),

  getById: (id: string) =>
    api.get<Master>(`/masters/${id}`).then((r) => r.data),

  getAddressDetails: (id: string) =>
    api.get<MasterAddressDetails>(`/masters/${id}/address-details`).then((r) => r.data),

  rememberVisit: (id: string) =>
    api.post(`/masters/${id}/view`).then(() => undefined),

  // Последние открытые мастера клиента — для RecentMastersPage.
  getRecentMasters: () =>
    api.get<RecentMaster[]>('/masters/recent').then((r) => r.data),

  // tz=пояс клиента → бэкенд возвращает слоты в его поясе (объекты ClientSlot),
  // date трактуется как дата в поясе клиента.
  getSlots: (masterId: string, date: string, serviceId: string) =>
    api.get<ClientSlot[]>(`/schedule/${masterId}/slots`, { params: { date, serviceId, tz: deviceTz() } }).then((r) => r.data),

  getAvailability: (masterId: string, from: string, to: string, serviceId: string) =>
    api.get<Record<string, boolean>>(`/schedule/${masterId}/availability`, { params: { from, to, serviceId, tz: deviceTz() } }).then((r) => r.data),
}
