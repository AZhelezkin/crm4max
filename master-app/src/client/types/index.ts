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
  /** Если задан — клиент выбрал «Мой адрес» (выезд). Иначе услуга у мастера. */
  clientAddress: string | null
  master: { id: string; name: string; photo: string | null; location: string | null }
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

export interface BookingDraft {
  masterId: string
  service: Service | null
  categoryName: string | null
  date: string
  time: string
  remind: boolean
  /** Если задан — клиент выбрал «Мой адрес» (выезд мастера). Null — у мастера. */
  clientAddress: string | null
}
