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
import WelcomePage from '@/pages/WelcomePage'
import AboutMePage from '@/pages/AboutMePage'
import SchedulePage from '@/pages/SchedulePage'
import ServicesPage from '@/pages/ServicesPage'
import BookingDetailPage from '@/pages/BookingDetailPage'
import CreateBookingPage from '@/pages/CreateBookingPage'
import PaymentSettingsPage from '@/pages/PaymentSettingsPage'
import ShareLinkPage from '@/pages/ShareLinkPage'
import MapTestPage from '@/pages/MapTestPage'

// Режимы по start_param из Max WebApp (window.WebApp.initDataUnsafe.start_param):
//   ""      → клиент, QR сканер (нативная кнопка или бот без startapp)
//   <UUID>  → клиент, запись к конкретному мастеру
//   "mmode" → мастер (кабинет / онбординг)
export const startParam = window.WebApp?.initDataUnsafe?.start_param ?? ''
const isClientMode = startParam !== 'mmode'

document.documentElement.dataset.theme = isClientMode ? 'client' : 'master'

// Отдельный эскейп для отладки карты в обычном браузере: #/map-test
// открывается в любом режиме, минуя Max WebApp / client-mode ветку.
function isMapTestHash() {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash || ''
  return hash.startsWith('#/map-test')
}

export default function App() {
  if (isMapTestHash()) return <MapTestPage />
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
  // Велком-сплэш — только если мастер ещё не начал заполнять профиль.
  // Как только имя сохранено (шаг 0 онбординга), возвращаемся сразу на /onboarding.
  const masterAlreadyStarted = Boolean(master?.name && master.name.trim().length > 0)
  const firstStopForNewMaster = masterAlreadyStarted ? '/onboarding' : '/welcome'

  return (
    <BrowserRouter>
      <Routes>
        {/* Велком-сплэш — только для новых мастеров, до первого клика по «Присоединиться» */}
        <Route
          path="/welcome"
          element={needsOnboarding ? <WelcomePage /> : <Navigate to="/" replace />}
        />

        {/* Онбординг — доступен только до завершения */}
        <Route
          path="/onboarding"
          element={needsOnboarding ? <OnboardingPage /> : <Navigate to="/" replace />}
        />

        {/* Все остальные роуты — только после онбординга */}
        <Route element={needsOnboarding ? <Navigate to={firstStopForNewMaster} replace /> : <Outlet />}>
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
