import { api } from './client'
import type { Booking, BookingPackage, BookingReminder } from '@client/types'

export const bookingsApi = {
  create: (data: { masterId: string; serviceId: string; date: string; time: string; remind?: boolean; reminder?: BookingReminder; clientAddress?: string | null }) =>
    api.post<Booking>('/bookings', data).then((r) => r.data),

  /** Запись на услугу-курс: даты+время на все N сеансов сразу. */
  createPackage: (data: {
    masterId: string
    serviceId: string
    slots: { date: string; time: string }[]
    remind?: boolean
    clientAddress?: string | null
  }) =>
    api.post<BookingPackage>('/bookings/package', data).then((r) => r.data),

  list: (params?: { status?: string; from?: string; to?: string }) =>
    api.get<Booking[]>('/bookings', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Booking>(`/bookings/${id}`).then((r) => r.data),

  getPackageById: (id: string) =>
    api.get<BookingPackage>(`/bookings/package/${id}`).then((r) => r.data),

  reschedule: (id: string, data: { date: string; time: string }) =>
    api.post<Booking>(`/bookings/${id}/reschedule`, data).then((r) => r.data),

  updateReminder: (id: string, reminder: BookingReminder) =>
    api.post<Booking>(`/bookings/${id}/reminder`, { reminder }).then((r) => r.data),

  cancel: (id: string) =>
    api.post<Booking>(`/bookings/${id}/cancel`).then((r) => r.data),

  /** Отмена всего курса (всех ещё не завершённых сеансов). */
  cancelPackage: (id: string) =>
    api.post<BookingPackage>(`/bookings/package/${id}/cancel`).then((r) => r.data),
}
