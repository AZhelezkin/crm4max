import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@client/store/auth.store'
import { startParam } from '@/App'

import MasterCardPage    from '@client/pages/MasterCardPage'
import ServiceSelectPage from '@client/pages/ServiceSelectPage'
import CalendarPage      from '@client/pages/CalendarPage'
import ConfirmPage       from '@client/pages/ConfirmPage'
import DepositPage       from '@client/pages/DepositPage'
import SuccessPage       from '@client/pages/SuccessPage'
import MyBookingsPage    from '@client/pages/MyBookingsPage'
import BookingDetailPage from '@client/pages/BookingDetailPage'
import MessagesPage      from '@client/pages/MessagesPage'
import ContactsPage      from '@client/pages/ContactsPage'
import QRScanPage        from '@client/pages/QRScanPage'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Если startParam — UUID, сразу показываем карточку мастера. Иначе — QR-сканер.
const defaultRoute = UUID_REGEX.test(startParam) ? '/' : '/qr'

export default function ClientApp() {
  const { init, isLoading } = useAuthStore()

  useEffect(() => { init() }, [init])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>Загрузка...</span>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/"                element={UUID_REGEX.test(startParam) ? <MasterCardPage /> : <Navigate to="/qr" replace />} />
        <Route path="/qr"              element={<QRScanPage />} />
        <Route path="/book/services"   element={<ServiceSelectPage />} />
        <Route path="/book/calendar"   element={<CalendarPage />} />
        <Route path="/book/confirm"    element={<ConfirmPage />} />
        <Route path="/book/deposit"    element={<DepositPage />} />
        <Route path="/book/success"    element={<SuccessPage />} />
        <Route path="/my-bookings"     element={<MyBookingsPage />} />
        <Route path="/my-bookings/:id" element={<BookingDetailPage />} />
        <Route path="/messages"        element={<MessagesPage />} />
        <Route path="/contacts"        element={<ContactsPage />} />
        <Route path="*"                element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </HashRouter>
  )
}
