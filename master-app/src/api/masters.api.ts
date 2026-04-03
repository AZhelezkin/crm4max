import { api } from './client'
import type { Master } from '@/types'

export const mastersApi = {
  getMe: () =>
    api.get<Master>('/masters/me').then((r) => r.data),

  updateProfile: (data: Partial<Pick<Master, 'name' | 'photo' | 'description' | 'contacts' | 'location' | 'isOnboarded'>>) =>
    api.put<Master>('/masters/me', data).then((r) => r.data),

  updatePayment: (data: { cardNumber?: string; vkPayLinked?: boolean }) =>
    api.put<Master>('/masters/me/payment', data).then((r) => r.data),

  getSlots: (masterId: string, date: string, serviceId: string) =>
    api.get<string[]>(`/schedule/${masterId}/slots`, { params: { date, serviceId } }).then((r) => r.data),
}
