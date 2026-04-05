import { useEffect } from 'react'
import { HashRouter as BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
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
import ShareLinkPage from '@/pages/ShareLinkPage'

// Режимы по start_param из Max WebApp (window.WebApp.initDataUnsafe.start_param):
//   <UUID>  → клиент, запись к конкретному мастеру
//   "qr"    → клиент, режим сканирования QR-кода мастера
//   "mmode" → мастер (кабинет / онбординг)
//   ""      → мастер (прямой переход без startapp)
// Fallback для GitHub Pages / разработки: hash-параметр #/?masterId=<UUID>
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const startParam = window.WebApp?.initDataUnsafe?.start_param ?? ''
const hashSearch = window.location.hash.split('?')[1] ?? ''
const fallbackMasterId = new URLSearchParams(hashSearch).get('masterId') ?? ''
const isClientMode = UUID_REGEX.test(startParam) || UUID_REGEX.test(fallbackMasterId) || startParam === 'qr'

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

  // Новый мастер, не прошедший онбординг; или мастер не авторизован
  const needsOnboarding = !master || !master.isOnboarded

  return (
    <BrowserRouter>
      <Routes>
        {/* Онбординг — доступен только до завершения */}
        <Route
          path="/onboarding"
          element={needsOnboarding ? <OnboardingPage /> : <Navigate to="/" replace />}
        />

        {/* Все остальные роуты — только после онбординга */}
        <Route element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Outlet />}>
          <Route element={<MainLayout />}>
            <Route index element={<ProfilePage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="clients" element={<ChatsPage />} />
            <Route path="income" element={<PaymentsPage />} />
          </Route>

          <Route path="/bookings/new" element={<CreateBookingPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route path="/about" element={<AboutMePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/payment-settings" element={<PaymentSettingsPage />} />
          <Route path="/share" element={<ShareLinkPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
