import { useEffect, useState } from 'react'
import { HashRouter as BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import ClientApp from '@client/ClientApp'

import MainLayout from '@/components/MainLayout'
import ScrollToTop from '@/components/ScrollToTop'
import ProfilePage from '@/pages/ProfilePage'
import BookingsPage from '@/pages/BookingsPage'
import ClientsPage from '@/pages/ClientsPage'
import PaymentsPage from '@/pages/PaymentsPage'
import PaymentsDayPage from '@/pages/PaymentsDayPage'

import OnboardingPage from '@/pages/OnboardingPage'
import WelcomePage from '@/pages/WelcomePage'
import AboutMePage from '@/pages/AboutMePage'
import SettingsPage from '@/pages/SettingsPage'
import SchedulePage from '@/pages/SchedulePage'
import ServicesPage from '@/pages/ServicesPage'
import BookingDetailPage from '@/pages/BookingDetailPage'
import CreateBookingPage from '@/pages/CreateBookingPage'
import PaymentSettingsPage from '@/pages/PaymentSettingsPage'
import ShareLinkPage from '@/pages/ShareLinkPage'
import MapTestPage from '@/pages/MapTestPage'
import BlockedSubscriptionPage from '@/pages/BlockedSubscriptionPage'
import { subscriptionApi } from '@/api/subscription.api'

// Режимы по start_param из Max WebApp (window.WebApp.initDataUnsafe.start_param):
//   "mmode" → мастер (кабинет / онбординг) — быстрый путь
//   <UUID>  → клиент, запись к конкретному мастеру — быстрый путь
//   ""      → авто-определение: бэкенд проверяет max_user_id по БД
//
// Браузерный фолбэк: start_param можно передать прямо в URL —
//   ?startapp=<value> (универсально: cmasters, mmode, UUID, …) — для прямого
//             веб-адреса/нативной web-app кнопки в Max;
//   ?masterId=<UUID> — старый алиас для шаринга ссылки на мастера.
// В Max start_param приходит из initDataUnsafe и имеет приоритет.
function resolveStartParam(): string {
  const fromMax = window.WebApp?.initDataUnsafe?.start_param
  if (fromMax) return fromMax
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search)
    return q.get('startapp') || q.get('masterId') || ''
  }
  return ''
}
export const startParam = resolveStartParam()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_PART = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
// Deep-link из бот-уведомлений на BookingDetailPage:
//   <masterId>-<bookingId>    → клиентское приложение, /my-bookings/<bookingId>
//   m-<masterId>-<bookingId>  → мастер-приложение, /bookings/<bookingId>
const CLIENT_BOOKING_DEEPLINK_RE = new RegExp(`^(${UUID_PART})-(${UUID_PART})$`, 'i')
const MASTER_BOOKING_DEEPLINK_RE = new RegExp(`^m-(${UUID_PART})-(${UUID_PART})$`, 'i')

export function getMasterBookingDeepLinkId(): string | null {
  const m = MASTER_BOOKING_DEEPLINK_RE.exec(startParam ?? '')
  // m[1]=masterId, m[2]=bookingId
  return m ? m[2] : null
}

function resolveInitialMode(): 'master' | 'client' | null {
  if (startParam === 'mmode') return 'master'
  if (MASTER_BOOKING_DEEPLINK_RE.test(startParam)) return 'master'
  // Список последних мастеров (открывается из клиент-бота).
  if (startParam === 'cmasters') return 'client'
  if (UUID_RE.test(startParam)) return 'client'
  if (CLIENT_BOOKING_DEEPLINK_RE.test(startParam)) return 'client'
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
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100dvh', background: 'var(--color-background)',
      }}>
        <span style={{ color: 'var(--color-on-surface-secondary)' }}>Загрузка...</span>
      </div>
    )
  }

  return mode === 'client' ? <ClientApp /> : <MasterApp />
}

// Одноразовый deep-link редирект: при первом заходе на «/» в master-режиме
// проверяем startparam=mb-<id> → /bookings/<id>. Флаг гарантирует, что
// последующие переходы на «/» (например через нав-таб) уже не редиректят.
let masterDeepLinkConsumed = false

function MasterIndexRoute() {
  if (!masterDeepLinkConsumed) {
    masterDeepLinkConsumed = true
    const id = getMasterBookingDeepLinkId()
    if (id) return <Navigate to={`/bookings/${id}`} replace />
  }
  return <ProfilePage />
}

function MasterApp() {
  const { init, isLoading, master } = useAuthStore()
  // Подписка заблокирована (не оплачена после grace) → весь кабинет закрыт
  // экраном «Оформить подписку». Проверяем только у онбордингованного мастера —
  // новый идёт через триал, у него статус TRIALING.
  const [subBlocked, setSubBlocked] = useState(false)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!master?.isOnboarded) return
    subscriptionApi.getMe()
      .then((s) => setSubBlocked(s?.status === 'BLOCKED'))
      .catch(() => {})
  }, [master?.isOnboarded])

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

  // Заблокированная подписка перекрывает кабинет (но не онбординг нового мастера).
  if (!needsOnboarding && subBlocked) {
    return <BlockedSubscriptionPage />
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
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
            <Route index element={<MasterIndexRoute />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="income" element={<PaymentsPage />} />
          </Route>

          <Route path="/bookings/new" element={<CreateBookingPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
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
