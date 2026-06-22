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
  schedule: Schedule | null
  categories: Category[]
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

export interface Category {
  id: string
  name: string
  description: string | null
  photo: string | null
  services: Service[]
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

export interface Booking {
  id: string
  date: string
  time: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  paymentStatus: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
  notes: string | null
  /** Напоминание за 1 час (Booking.remind в БД). */
  remind?: boolean
  /** Если задан — клиент выбрал «Мой адрес» (выезд). Иначе услуга у мастера. */
  clientAddress: string | null
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
  }
  client: { id: string; name: string; photo: string | null }
  service: Service
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
  /** Если задан — клиент выбрал «Мой адрес» (выезд мастера). Null — у мастера. */
  clientAddress: string | null
}
