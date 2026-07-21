export interface Master {
  id: string
  name: string
  photo: string | null
  description: string | null
  contacts: string | null
  phone: string | null
  location: string | null
  /** Заметка к адресу (как пройти/вход) — виджет адреса на главной. */
  locationNote: string | null
  lat: number | null
  lng: number | null
  rating: number
  cardNumber: string | null
  vkPayLinked: boolean
  homeVisit: boolean
  isOnboarded: boolean
  schedule: Schedule | null
  services?: Service[]
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
  price: number           // копейки
  discountPercent: number | null  // 0-100%
  /** Сколько приёмов нужно записать сразу: 1 = обычная услуга, >1 = абонемент.
   *  price и discountPercent — за один приём; стоимость абонемента = price × N. */
  sessionsCount: number
  photo: string | null
  isActive: boolean
  /** Системная услуга «Прочее» (price=0): видна только мастеру, цену вводит вручную
   *  при создании записи. Скрыта из редактора услуг, доступна в пикере записи. */
  isMisc?: boolean
  workPhotos: ServicePhoto[]
}

/** Плоский список услуг мастера (backend отдаёт master.services). */
export function masterServiceList(m: { services?: Service[] }): Service[] {
  return m.services ?? []
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

/** Услуга в записи (мультиуслуги). Запись мастером может содержать несколько. */
export interface BookingServiceItem {
  id: string
  service: Service
  /** Индивидуальная цена (копейки) для «Прочее»; null → цена услуги со скидкой. */
  price: number | null
  order: number
}

export interface Booking {
  id: string
  date: string           // "2025-03-25"
  time: string           // "14:00"
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  paymentStatus: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
  notes: string | null
  /** Индивидуальная сумма записи (копейки) для услуги «Прочее». null → берём service.price. */
  price: number | null
  /** Адрес выезда мастера (если задан); null — услуга у мастера. */
  clientAddress: string | null
  remind: boolean
  /** Цвет записи (hex), выбранный мастером; null — цвет по статусу. */
  color: string | null
  master: { id: string; name: string; photo: string | null; location: string | null; lat: number | null; lng: number | null }
  client: { id: string; name: string; phone: string | null; photo: string | null }
  /** Первичная услуга (= services[0]). Оставлена для обратной совместимости. */
  service: Service
  /** Все услуги записи (мультиуслуги). Пусто → одиночная услуга (service). */
  services: BookingServiceItem[]
  payments: Payment[]
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
  totalAmount: number       // копейки — цена курса на момент записи
  paymentStatus: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
  master: { id: string; name: string; photo: string | null; location: string | null }
  client: { id: string; name: string; phone: string | null; photo: string | null }
  service: Service
  bookings: PackageSession[]
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

/** Человекочитаемая длительность: «30 минут», «1 час», «1.5 часа», «2 часа» (макет «Список услуг»). */
export function formatDurationHuman(min: number): string {
  if (min < 60) {
    const m10 = min % 10, m100 = min % 100
    const w = m10 === 1 && m100 !== 11 ? 'минута'
      : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 'минуты' : 'минут'
    return `${min} ${w}`
  }
  const hours = min / 60
  if (Number.isInteger(hours)) {
    const h10 = hours % 10, h100 = hours % 100
    const w = h10 === 1 && h100 !== 11 ? 'час'
      : h10 >= 2 && h10 <= 4 && (h100 < 10 || h100 >= 20) ? 'часа' : 'часов'
    return `${hours} ${w}`
  }
  // Дробные часы (1.5, 2.5 …) — всегда «часа», точка как в макете.
  return `${hours} часа`
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

/** Итоговая стоимость записи (копейки) — Σ по всем услугам. */
export function bookingTotal(b: Pick<Booking, 'services' | 'service' | 'price'>): number {
  return bookingServiceItems(b).reduce((sum, item) => sum + bookingItemPrice(item), 0)
}

/** Суммарная длительность записи (минуты) — Σ по всем услугам. */
export function bookingDuration(b: Pick<Booking, 'services' | 'service'>): number {
  return bookingServiceItems({ ...b, price: null }).reduce((sum, item) => sum + item.service.duration, 0)
}

/** Названия услуг записи через запятую (мультиуслуги) или имя единственной услуги. */
export function bookingServiceNames(b: Pick<Booking, 'services' | 'service'>): string {
  return bookingServiceItems({ ...b, price: null }).map((item) => item.service.name).join(', ')
}
