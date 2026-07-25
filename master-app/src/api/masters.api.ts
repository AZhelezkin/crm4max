import { api } from './client'
import type { Master, Review } from '@/types'

export const mastersApi = {
  getMe: () =>
    api.get<Master>('/masters/me').then((r) => r.data),

  getReviews: (masterId: string) =>
    api.get<{ reviews: Review[] }>(`/masters/${masterId}`).then((r) => r.data.reviews),

  updateProfile: (data: Partial<Pick<Master, 'name' | 'photo' | 'description' | 'contacts' | 'phone' | 'location' | 'locationNote' | 'lat' | 'lng' | 'homeVisit' | 'isOnboarded'>>) =>
    api.put<Master>('/masters/me', data).then((r) => r.data),

  updatePayment: (data: { cardNumber?: string; vkPayLinked?: boolean }) =>
    api.put<Master>('/masters/me/payment', data).then((r) => r.data),

  /** Отметить шаг гида «Добро пожаловать!» (идемпотентный merge на бэке). */
  markGuideStep: (step: 'edited' | 'shared' | 'openedBooking' | 'dismissed') =>
    api.post<{ guideProgress: NonNullable<Master['guideProgress']> }>('/masters/me/guide-step', { step }).then((r) => r.data),

  getSlots: (masterId: string, date: string, serviceId: string) =>
    api.get<string[]>(`/schedule/${masterId}/slots`, { params: { date, serviceId } }).then((r) => r.data),

  getAvailability: (masterId: string, from: string, to: string, serviceId: string) =>
    api.get<Record<string, boolean>>(`/schedule/${masterId}/availability`, { params: { from, to, serviceId } }).then((r) => r.data),
}
