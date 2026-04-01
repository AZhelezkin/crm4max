import { useEffect } from 'react'
import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import ClientApp from '@client/ClientApp'

import MainLayout from '@/components/MainLayout'
import ProfilePage from '@/pages/ProfilePage'
import BookingsPage from '@/pages/BookingsPage'
import ChatsPage from '@/pages/ChatsPage'
import PaymentsPage from '@/pages/PaymentsPage'

import OnboardingPage from '@/pages/OnboardingPage'
import AboutMePage from '@/pages/AboutMePage'
import SchedulePage from '@/pages/SchedulePage'
import ServicesPage from '@/pages/ServicesPage'
import BookingDetailPage from '@/pages/BookingDetailPage'
import CreateBookingPage from '@/pages/CreateBookingPage'
import PaymentSettingsPage from '@/pages/PaymentSettingsPage'

// Определяем режим по start_param из Max WebApp (window.WebApp.initDataUnsafe.start_param).
// Если ?startapp=<UUID мастера> — открываем клиентское приложение (бронирование).
// Если start_param отсутствует или не является UUID — открываем приложение мастера.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const startParam = window.WebApp?.initDataUnsafe?.start_param ?? ''
const isClientMode = UUID_REGEX.test(startParam)

document.documentElement.dataset.theme = isClientMode ? 'client' : 'master'

export default function App() {
  if (isClientMode) return <ClientApp />
  return <MasterApp />
}

function MasterApp() {
  const { init, isLoading, master } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100dvh', background: 'var(--color-bg)',
      }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>Загрузка...</span>
      </div>
    )
  }

  // Новый мастер без имени → онбординг
  const needsOnboarding = master && !master.name

  return (
    <BrowserRouter>
      <Routes>
        {/* Онбординг */}
        <Route
          path="/onboarding"
          element={needsOnboarding ? <OnboardingPage /> : <Navigate to="/" replace />}
        />

        {/* Главный layout с bottom nav */}
        <Route element={<MainLayout />}>
          <Route
            index
            element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <ProfilePage />}
          />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="clients" element={<ChatsPage />} />
          <Route path="income" element={<PaymentsPage />} />
        </Route>

        {/* Вложенные страницы (без bottom nav) */}
        <Route path="/bookings/new" element={<CreateBookingPage />} />
        <Route path="/bookings/:id" element={<BookingDetailPage />} />
        <Route path="/about" element={<AboutMePage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/payment-settings" element={<PaymentSettingsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
