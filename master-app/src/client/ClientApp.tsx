import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@client/store/auth.store'
import { startParam } from '@/App'
import MasterCardSkeleton from '@client/components/MasterCardSkeleton'

import MasterCardPage    from '@client/pages/MasterCardPage'
import CategorySelectPage from '@client/pages/CategorySelectPage'
import ServiceSelectPage from '@client/pages/ServiceSelectPage'
import ServiceDetailPage from '@client/pages/ServiceDetailPage'
import CalendarPage      from '@client/pages/CalendarPage'
import ConfirmPage       from '@client/pages/ConfirmPage'
import DepositPage       from '@client/pages/DepositPage'
import SuccessPage       from '@client/pages/SuccessPage'
import MyBookingsPage    from '@client/pages/MyBookingsPage'
import MessagesPage      from '@client/pages/MessagesPage'
import ContactsPage      from '@client/pages/ContactsPage'
import QRScanPage        from '@client/pages/QRScanPage'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Если startParam — UUID, пришли от мастера напрямую → карточка мастера
// Иначе — QR-сканер, пока masterId не появится в URL после скана
function HomeRoute() {
  const [params] = useSearchParams()
  const masterId = UUID_REGEX.test(startParam) ? startParam : params.get('masterId')
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
        <Route path="/book/success"    element={<SuccessPage />} />
        <Route path="/my-bookings"     element={<MyBookingsPage />} />
        {/* Карточка существующей записи использует SuccessPage (объединённый
            экран после создания / просмотра — данные тянутся по :id). */}
        <Route path="/my-bookings/:id" element={<SuccessPage />} />
        <Route path="/messages"        element={<MessagesPage />} />
        <Route path="/contacts"        element={<ContactsPage />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
