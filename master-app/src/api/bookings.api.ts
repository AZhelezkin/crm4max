import { api } from './client'
import type { Booking, BookingPackage } from '@/types'

export const bookingsApi = {
  list: (params?: { status?: string; from?: string; to?: string }) =>
    api.get<Booking[]>('/bookings', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Booking>(`/bookings/${id}`).then((r) => r.data),

  create: (data: {
    masterId: string
    serviceId: string
    date: string
    time: string
    clientId?: string
    /** Строка адресной книги мастера — позволяет записать и ручного клиента (без Max). */
    masterClientId?: string
    remind?: boolean
    clientAddress?: string | null
    /** Индивидуальная сумма (копейки) для услуги «Прочее». */
    price?: number
    /** Цвет записи (hex) — для расписания. */
    color?: string | null
    /** Мультиуслуги (только запись мастером): все услуги записи. services[0] = первичная. */
    services?: { serviceId: string; price?: number | null }[]
    /** Итог записи (копейки), заданный мастером. Может не равняться сумме услуг. */
    totalPrice?: number | null
    /** Длина занятого блока (Σ длительностей услуг) — для расписания/слотов клиента. */
    durationMinutes?: number
    /** Свободное время мастера: разрешить пересечения (пропустить проверку слотов). */
    allowOverlap?: boolean
  }) => api.post<Booking>('/bookings', data).then((r) => r.data),

  /** Запись на услугу-абонемент: даты+время на все N приёмов сразу. */
  createPackage: (data: {
    masterId: string
    serviceId: string
    slots: { date: string; time: string }[]
    clientId?: string
    masterClientId?: string
    remind?: boolean
    clientAddress?: string | null
  }) => api.post<BookingPackage>('/bookings/package', data).then((r) => r.data),

  confirmPayment: (id: string) =>
    api.post<Booking>(`/bookings/${id}/confirm-payment`).then((r) => r.data),

  /** Разовое напоминание клиенту в бот. sent=false — у клиента нет чата Max. */
  remind: (id: string) =>
    api.post<{ sent: boolean }>(`/bookings/${id}/remind`).then((r) => r.data),

  reschedule: (id: string, data: { date: string; time: string; allowOverlap?: boolean }) =>
    api.post<Booking>(`/bookings/${id}/reschedule`, data).then((r) => r.data),

  cancel: (id: string) =>
    api.post<Booking>(`/bookings/${id}/cancel`).then((r) => r.data),
}
