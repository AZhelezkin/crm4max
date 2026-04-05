import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
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
const isQRMode = !UUID_REGEX.test(startParam)

// В QR-режиме: если masterId уже получен (после скана) — карточка мастера, иначе — сканер
function RootRoute() {
  const [params] = useSearchParams()
  const hasMasterId = !!params.get('masterId') || UUID_REGEX.test(startParam)
  if (isQRMode && !hasMasterId) return <Navigate to="/qr" replace />
  return <MasterCardPage />
}

export default function ClientApp() {
  const { init, isLoading } = useAuthStore()

  useEffect(() => { init() }, [init])

  if (isLoading && !isQRMode) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>Загрузка...</span>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/"                element={<RootRoute />} />
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
        <Route path="*"                element={<Navigate to={isQRMode ? '/qr' : '/'} replace />} />
      </Routes>
    </HashRouter>
  )
}
