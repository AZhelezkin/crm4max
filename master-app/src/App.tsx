import { useEffect, useState } from 'react'
import { HashRouter as BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import ClientApp from '@client/ClientApp'

import MainLayout from '@/components/MainLayout'
import ProfilePage from '@/pages/ProfilePage'
import BookingsPage from '@/pages/BookingsPage'
import ChatsPage from '@/pages/ChatsPage'
import PaymentsPage from '@/pages/PaymentsPage'
import PaymentsDayPage from '@/pages/PaymentsDayPage'

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
import ThemeSwitcher from '@/components/ThemeSwitcher'

// Режимы по start_param из Max WebApp (window.WebApp.initDataUnsafe.start_param):
//   "mmode" → мастер (кабинет / онбординг) — быстрый путь
//   <UUID>  → клиент, запись к конкретному мастеру — быстрый путь
//   ""      → авто-определение: бэкенд проверяет max_user_id по БД
//
// Браузерный фолбэк: ?masterId=<UUID> в URL открывает клиентский режим
// для этого мастера (используется для шаринга ссылок вне Max).
function resolveStartParam(): string {
  const fromMax = window.WebApp?.initDataUnsafe?.start_param
  if (fromMax) return fromMax
  if (typeof window !== 'undefined') {
    const masterId = new URLSearchParams(window.location.search).get('masterId')
    if (masterId) return masterId
  }
  return ''
}
export const startParam = resolveStartParam()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function resolveInitialMode(): 'master' | 'client' | null {
  if (startParam === 'mmode') return 'master'
  if (UUID_RE.test(startParam)) return 'client'
  return null
}

function isMapTestHash() {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash || ''
  return hash.startsWith('#/map-test')
}

export default function App() {
  const [mode, setMode] = useState<'master' | 'client' | null>(resolveInitialMode)

  useEffect(() => {
    if (mode !== null) return

    async function detect() {
      try {
        const initData = window.WebApp?.initData
        if (!initData) { setMode('client'); return }
        window.WebApp?.ready()

        const apiUrl = import.meta.env.VITE_API_URL ?? ''
        const res = await fetch(`${apiUrl}/api/auth/max`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ init_data: initData }),
        })
        if (!res.ok) { setMode('client'); return }

        const data = await res.json() as { token: string; role: string }
        if (data.role === 'master') {
          localStorage.setItem('masterToken', data.token)
          setMode('master')
        } else {
          setMode('client')
        }
      } catch {
        setMode('client')
      }
    }
    detect()
  }, [mode])

  if (isMapTestHash()) return <MapTestPage />

  if (mode === null) {
    return (
      <>
        <ThemeSwitcher />
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: '100dvh', background: 'var(--color-background)',
        }}>
          <span style={{ color: 'var(--color-on-surface-secondary)' }}>Загрузка...</span>
        </div>
      </>
    )
  }

  return (
    <>
      <ThemeSwitcher />
      {mode === 'client' ? <ClientApp /> : <MasterApp />}
    </>
  )
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
        height: '100dvh', background: 'var(--color-background)',
      }}>
        <span style={{ color: 'var(--color-on-surface-secondary)' }}>Загрузка...</span>
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
          <Route path="/income/:date" element={<PaymentsDayPage />} />
          <Route path="/payment-settings" element={<PaymentSettingsPage />} />
          <Route path="/share" element={<ShareLinkPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
