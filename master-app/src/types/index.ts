export interface Master {
  id: string
  name: string
  photo: string | null
  description: string | null
  contacts: string | null
  phone: string | null
  location: string | null
  lat: number | null
  lng: number | null
  rating: number
  cardNumber: string | null
  vkPayLinked: boolean
  homeVisit: boolean
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

/** Синтетическая категория-папка, в которую бэкенд сводит услуги без категории
 *  (Service.categoryId === null). Приходит последней в master.categories. */
export const UNCATEGORIZED_CATEGORY_ID = 'uncategorized'

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

/** Клиент в адресной книге мастера (вкладка «Клиенты»). id — строки MasterClient. */
export interface Client {
  id: string
  /** Глобальный Client (Max) — нужен для создания записи мастером; null у добавленных вручную. */
  clientId: string | null
  name: string
  phone: string | null
  photo: string | null
  /** true — клиент есть в Max (записывался); false — добавлен мастером вручную. */
  isMaxUser: boolean
}

export interface Booking {
  id: string
  date: string           // "2025-03-25"
  time: string           // "14:00"
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  paymentStatus: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
  notes: string | null
  /** Адрес выезда мастера (если задан); null — услуга у мастера. */
  clientAddress: string | null
  remind: boolean
  master: { id: string; name: string; photo: string | null; location: string | null; lat: number | null; lng: number | null }
  client: { id: string; name: string; phone: string | null; photo: string | null }
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
  booking?: {
    id: string
    date: string
    time: string
    paymentStatus: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
    client: { id: string; name: string; photo: string | null }
    service: { id: string; name: string; price: number }
  }
}

export interface Review {
  id: string
  rating: number
  text: string | null
  createdAt: string
  client: { name: string; photo: string | null }
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
