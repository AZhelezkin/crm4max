export interface Master {
  id: string
  name: string
  photo: string | null
  description: string | null
  contacts: string | null
  location: string | null
  lat: number | null
  lng: number | null
  rating: number
  cardNumber: string | null
  vkPayLinked: boolean
  isOnboarded: boolean
  schedule: Schedule | null
  categories: Category[]
}

export interface Schedule {
  id: string
  workingDays: number[]  // 1=Пн ... 7=Вс
  startTime: string      // "09:00"
  endTime: string        // "20:00"
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
  categoryId: string | null
  name: string
  description: string | null
  duration: number
  price: number           // копейки
  discountPercent: number | null  // 0-100%
  photo: string | null
  isActive: boolean
  workPhotos: ServicePhoto[]
}

export interface Booking {
  id: string
  date: string           // "2025-03-25"
  time: string           // "14:00"
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  paymentStatus: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
  notes: string | null
  master: { id: string; name: string; photo: string | null }
  client: { id: string; name: string; photo: string | null }
  service: Service
  payments: Payment[]
}

export interface Payment {
  id: string
  bookingId: string
  amount: number
  method: 'CARD' | 'VK_PAY'
  status: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
  createdAt: string
}

/** Расчёт цены со скидкой в копейках */
export function discountedPrice(price: number, discountPercent: number | null): number | null {
  if (!discountPercent) return null
  return Math.round(price * (1 - discountPercent / 100))
}

/** Форматирование цены из копеек в рубли */
export function formatPrice(kopecks: number): string {
  return (kopecks / 100).toLocaleString('ru-RU') + ' ₽'
}

/** Форматирование длительности */
export function formatDuration(min: number): string {
  return `${min} мин`
}
