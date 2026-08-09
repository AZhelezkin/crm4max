export interface Master {
  id: string
  name: string
  photo: string | null
  description: string | null
  phone: string | null
  location: string | null
  lat: number | null
  lng: number | null
  rating: number
  homeVisit: boolean
  /** Ссылка на профиль мастера в MAX. Пусто → раздел «Сообщения»/чат недоступен. */
  maxProfileLink: string | null
  /** IANA-пояс мастера — для перевода времени слотов/записей в пояс клиента. */
  timezone: string | null
  /** Подписка мастера заблокирована (не оплачена) → показываем клиенту заглушку. */
  blocked?: boolean
  schedule: Schedule | null
  services?: Service[]
  reviews: Review[]
}

export interface Schedule {
  workingDays: number[]
  startTime: string
  endTime: string
  breakStart: string | null
  breakEnd: string | null
  bufferMinutes: number
}

export interface ServicePhoto {
  id: string
  url: string
  order: number
}

export interface Service {
  id: string
  name: string
  description: string | null
  duration: number
  price: number
  discountPercent: number | null
  /** Сколько приёмов нужно записать сразу: 1 = обычная услуга, >1 = абонемент.
   *  price и discountPercent — за один приём; стоимость абонемента = price × N. */
  sessionsCount: number
  photo: string | null
  workPhotos: ServicePhoto[]
}

/** Плоский список услуг мастера (backend отдаёт master.services). */
export function masterServiceList(m: { services?: Service[] }): Service[] {
  return m.services ?? []
}

export function discountedPrice(price: number, discountPercent: number | null): number | null {
  if (!discountPercent) return null
  return Math.round(price * (1 - discountPercent / 100))
}

export function formatPrice(kopecks: number): string {
  return (kopecks / 100).toLocaleString('ru-RU') + ' ₽'
}

export function formatDuration(min: number): string {
  return `${min} мин`
}

export type BookingReminder = 'NONE' | 'ONE_HOUR' | 'TWO_HOURS' | 'MORNING' | 'ONE_DAY'

export const BOOKING_REMINDER_OPTIONS = [
  { value: 'NONE', label: 'Без напоминания' },
  { value: 'ONE_HOUR', label: 'Напомним за 1 час' },
  { value: 'TWO_HOURS', label: 'Напомним за 2 часа' },
  { value: 'MORNING', label: 'Напомним утром в 09:00' },
  { value: 'ONE_DAY', label: 'Напомним за сутки' },
] satisfies { value: BookingReminder; label: string }[]

export function bookingReminderLabel(reminder: BookingReminder | undefined, remind = true): string {
  const value = reminder ?? (remind ? 'ONE_HOUR' : 'NONE')
  return BOOKING_REMINDER_OPTIONS.find((option) => option.value === value)?.label ?? BOOKING_REMINDER_OPTIONS[1].label
}

export interface Booking {
  id: string
  date: string
  time: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  paymentStatus: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
  notes: string | null
  /** Индивидуальная сумма записи (копейки) для услуги «Прочее». null → service.price. */
  price: number | null
  /** Итог записи, заданный мастером вручную (копейки). null → сумма по услугам. */
  totalPrice?: number | null
  /** Напоминание за 1 час (Booking.remind в БД). */
  remind?: boolean
  reminder?: BookingReminder
  /** Если задан — клиент выбрал «Мой адрес» (выезд). Иначе услуга у мастера. */
  clientAddress: string | null
  /** HTTPS-ссылка для онлайн-записи, созданной мастером. */
  onlineMeetingLink: string | null
  master: {
    id: string
    name: string
    photo: string | null
    location: string | null
    description: string | null
    rating: number
    lat: number | null
    lng: number | null
    maxProfileLink: string | null
    timezone: string | null
  }
  client: { id: string; name: string; photo: string | null }
  /** Первичная услуга (= services[0]). Оставлена для обратной совместимости. */
  service: Service
  /** Все услуги записи (мастер мог добавить несколько). Пусто → одиночная (service). */
  services?: BookingServiceItem[]
  /** Признак оставленного отзыва (для гейта блока «Оцените услуги»). */
  review?: { id: string } | null
}

/** Услуга в записи (мультиуслуги; создаёт только мастер, клиент видит для чтения). */
export interface BookingServiceItem {
  id: string
  service: Service
  price: number | null
  order: number
}

/** Услуги записи: мультиуслуги (services) или фолбэк на единственную (service). */
export function bookingServiceItems(b: Pick<Booking, 'services' | 'service' | 'price'>): { service: Service; price: number | null }[] {
  if (b.services && b.services.length > 0) return b.services.map((s) => ({ service: s.service, price: s.price }))
  return [{ service: b.service, price: b.price }]
}

/** Эффективная цена позиции (копейки): индивидуальная (для «Прочее») или со скидкой. */
export function bookingItemPrice(item: { service: Service; price: number | null }): number {
  if (item.price != null) return item.price
  return discountedPrice(item.service.price, item.service.discountPercent) ?? item.service.price
}

/** Итог по всем услугам записи (копейки). */
export function bookingTotal(b: Pick<Booking, 'services' | 'service' | 'price'> & { totalPrice?: number | null }): number {
  if (b.totalPrice != null) return b.totalPrice
  return bookingServiceItems(b).reduce((sum, item) => sum + bookingItemPrice(item), 0)
}

/** Суммарная длительность записи (минуты). */
export function bookingDuration(b: Pick<Booking, 'services' | 'service'>): number {
  return bookingServiceItems({ ...b, price: null }).reduce((sum, item) => sum + item.service.duration, 0)
}

/** Названия услуг записи через запятую (мультиуслуги) или имя единственной услуги. */
export function bookingServiceNames(b: Pick<Booking, 'services' | 'service'>): string {
  return bookingServiceItems({ ...b, price: null }).map((item) => item.service.name).join(', ')
}

export interface Review {
  id: string
  rating: number
  text: string | null
  createdAt: string
  client: { name: string; photo: string | null }
}

/** Сеанс внутри пакета (курса) — лёгкая строка Booking без вложенных связей. */
export interface PackageSession {
  id: string
  date: string
  time: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  paymentStatus: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
  sessionIndex: number | null
  remind: boolean
  clientAddress: string | null
  onlineMeetingLink: string | null
}

/** Пакет записей (курс из N сеансов одной услуги). */
export interface BookingPackage {
  id: string
  sessionsTotal: number
  totalAmount: number
  paymentStatus: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
  master: { id: string; name: string; photo: string | null; location: string | null }
  client: { id: string; name: string; phone: string | null; photo: string | null }
  service: Service
  bookings: PackageSession[]
}

export interface BookingDraft {
  masterId: string
  service: Service | null
  categoryName: string | null
  date: string
  time: string
  /** Слоты курса (Service.sessionsCount > 1): дата+время на каждый сеанс.
   *  Для обычной услуги (1 сеанс) не используется — берутся date/time. */
  slots: { date: string; time: string }[]
  remind: boolean
  reminder: BookingReminder
  /** Если задан — клиент выбрал «Мой адрес» (выезд мастера). Null — у мастера. */
  clientAddress: string | null
  /** Только для переноса записи, которую мастер создал как онлайн. */
  onlineMeetingLink: string | null
  clientApartment: string
  clientFloor: string
  clientIntercom: string
}
