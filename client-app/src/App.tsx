import { useEffect } from 'react'
import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

import MasterCardPage    from '@/pages/MasterCardPage'
import ServiceSelectPage from '@/pages/ServiceSelectPage'
import CalendarPage      from '@/pages/CalendarPage'
import ConfirmPage       from '@/pages/ConfirmPage'
import DepositPage       from '@/pages/DepositPage'
import SuccessPage       from '@/pages/SuccessPage'
import MyBookingsPage    from '@/pages/MyBookingsPage'
import BookingDetailPage from '@/pages/BookingDetailPage'
import MessagesPage      from '@/pages/MessagesPage'
import ContactsPage      from '@/pages/ContactsPage'

export default function App() {
  const { init, isLoading } = useAuthStore()

  useEffect(() => { init() }, [init])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <span style={{ color: '#8E8E93' }}>Загрузка...</span>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={<MasterCardPage />} />
        <Route path="/book/services"   element={<ServiceSelectPage />} />
        <Route path="/book/calendar"   element={<CalendarPage />} />
        <Route path="/book/confirm"    element={<ConfirmPage />} />
        <Route path="/book/deposit"    element={<DepositPage />} />
        <Route path="/book/success"    element={<SuccessPage />} />
        <Route path="/my-bookings"     element={<MyBookingsPage />} />
        <Route path="/my-bookings/:id" element={<BookingDetailPage />} />
        <Route path="/messages"        element={<MessagesPage />} />
        <Route path="/contacts"        element={<ContactsPage />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
