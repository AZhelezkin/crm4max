import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@client/store/auth.store'
import { useBookingStore } from '@client/store/booking.store'
import { startParam } from '@/App'
import MasterCardSkeleton from '@client/components/MasterCardSkeleton'

import MasterCardPage    from '@client/pages/MasterCardPage'
import CategorySelectPage from '@client/pages/CategorySelectPage'
import ServiceSelectPage from '@client/pages/ServiceSelectPage'
import ServiceDetailPage from '@client/pages/ServiceDetailPage'
import CalendarPage      from '@client/pages/CalendarPage'
import ConfirmPage       from '@client/pages/ConfirmPage'
import DepositPage       from '@client/pages/DepositPage'
import BookingDetailPage from '@client/pages/BookingDetailPage'
import MyBookingsPage    from '@client/pages/MyBookingsPage'
import MessagesPage      from '@client/pages/MessagesPage'
import ContactsPage      from '@client/pages/ContactsPage'
import QRScanPage        from '@client/pages/QRScanPage'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_PART = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
// Deep-link на конкретную запись: startapp=<masterId>-<bookingId>
// masterId[1] + bookingId[2] — два UUID через дефис, 73 символа
const CLIENT_BOOKING_DEEPLINK_RE = new RegExp(`^(${UUID_PART})-(${UUID_PART})$`, 'i')

// Один раз пускаем deep-link редирект; после consume пользователь
// может вернуться на «/» через нав-таб (иначе HomeRoute бесконечно
// редиректил бы обратно на BookingDetailPage).
let clientDeepLinkConsumed = false

// Если startParam — UUID, пришли от мастера напрямую → карточка мастера
// Иначе fallback: storeMasterId (сохраняется при просмотре любой записи)
// Если совсем нет masterId — QR-сканер, пока masterId не появится в URL после скана
function HomeRoute() {
  const [params] = useSearchParams()
  const storeMasterId = useBookingStore((s) => s.masterId)

  // Deep-link на конкретную запись: startapp=b-<bookingId>. Префикс «b-»
  // отличает bookingId от masterId (оба UUID-формата). При первом заходе
  // редиректим на /my-bookings/<id> (BookingDetailPage). Делаем именно
  // в HomeRoute (а не на module-уровне), чтобы избежать TDZ при
  // циркулярном импорте App ↔ ClientApp.
  if (!clientDeepLinkConsumed) {
    clientDeepLinkConsumed = true
    const bookingMatch = CLIENT_BOOKING_DEEPLINK_RE.exec(startParam ?? '')
    // bookingMatch[1]=masterId, bookingMatch[2]=bookingId
    if (bookingMatch) {
      // Сохраняем masterId в store через Zustand нельзя (хук не в компоненте),
      // но BookingDetailPage сам сохранит masterId при загрузке записи
      return <Navigate to={`/my-bookings/${bookingMatch[2]}`} replace />
    }
  }

  const masterId = (UUID_REGEX.test(startParam) ? startParam : null)
    ?? params.get('masterId')
    ?? storeMasterId
  if (!masterId) return <QRScanPage />
  return <MasterCardPage />
}

export default function ClientApp() {
  const { init, isLoading } = useAuthStore()

  useEffect(() => { init() }, [init])

  if (isLoading) {
    // Skeleton-карточка мастера уместен только когда после auth откроется
    // именно MasterCardPage (root + UUID startParam). Если пользователь
    // открыл приложение по deep-link на /my-bookings или другую страницу —
    // skeleton мастера не имеет отношения к контенту, отдаём пустой экран.
    const targetIsHome = !window.location.hash || window.location.hash === '#/' || window.location.hash === '#'
    if (targetIsHome && UUID_REGEX.test(startParam)) {
      return <MasterCardSkeleton />
    }
    return <div style={{ height: '100dvh' }} />
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/"                element={<HomeRoute />} />
        <Route path="/book/categories" element={<CategorySelectPage />} />
        <Route path="/book/services"   element={<ServiceSelectPage />} />
        <Route path="/book/service"    element={<ServiceDetailPage />} />
        <Route path="/book/calendar"   element={<CalendarPage />} />
        <Route path="/book/confirm"    element={<ConfirmPage />} />
        <Route path="/book/deposit"    element={<DepositPage />} />
        <Route path="/book/success"    element={<BookingDetailPage />} />
        <Route path="/my-bookings"     element={<MyBookingsPage />} />
        {/* Карточка существующей записи — тот же компонент, данные по :id. */}
        <Route path="/my-bookings/:id" element={<BookingDetailPage />} />
        <Route path="/messages"        element={<MessagesPage />} />
        <Route path="/contacts"        element={<ContactsPage />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
