import { useEffect, useState } from 'react'
import { HashRouter as BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { keepVerticalSwipesDisabled } from '@/lib/bridge'
import { installHorizontalOverscrollGuard } from '@/lib/topOverscrollGuard'
import { abandonSubscriptionReturn, clearSubscriptionReturn, readSubscriptionReturn } from '@/lib/subscriptionReturn'
import ClientApp from '@client/ClientApp'

import MainLayout from '@/components/MainLayout'
import ScrollToTop from '@/components/ScrollToTop'
import HomePage from '@/pages/HomePage'
import BookingsPage from '@/pages/BookingsPage'
import ClientsPage from '@/pages/ClientsPage'
import PaymentsPage from '@/pages/PaymentsPage'
import PaymentsDayPage from '@/pages/PaymentsDayPage'

import WelcomePage from '@/pages/WelcomePage'
import AboutMePage from '@/pages/AboutMePage'
import AboutPlatformPage from '@/pages/AboutPlatformPage'
import PaymentMethodsPage from '@/pages/PaymentMethodsPage'
import ConsentsPage from '@/pages/ConsentsPage'
import AddressEditPage from '@/pages/AddressEditPage'
import SubscriptionPlanPage from '@/pages/SubscriptionPlanPage'
import SubscriptionSuccessPage from '@/pages/SubscriptionSuccessPage'
import SubscriptionFailedPage from '@/pages/SubscriptionFailedPage'
import SettingsPage from '@/pages/SettingsPage'
import SchedulePage from '@/pages/SchedulePage'
import ServicesPage from '@/pages/ServicesPage'
import BookingDetailPage from '@/pages/BookingDetailPage'
import CreateBookingPage from '@/pages/CreateBookingPage'
import PaymentSettingsPage from '@/pages/PaymentSettingsPage'
import ShareLinkPage from '@/pages/ShareLinkPage'
import OtherPage from '@/pages/OtherPage'
import MapTestPage from '@/pages/MapTestPage'
import SwipeTestPage from '@/pages/SwipeTestPage'
import DestinationSelectorPage from '@/standalone-pages/handoff/destination-selector/DestinationSelectorPage'
import { parseDestinationSelectorStartParam } from '@/standalone-pages/handoff/destination-selector/route'
import MetricsPageTracker from '@/components/MetricsPageTracker'
import { resolveLaunchSource, trackEventOnce } from '@/lib/metrics'

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

// T-Bank может отбросить URL fragment при возврате с hosted-формы. Backend
// передаёт результат обычным query-параметром, а HashRouter получает маршрут
// до первого render. Остальные query-параметры сохраняются.
function normalizePaymentResultRoute(): void {
  if (typeof window === 'undefined') return
  const query = new URLSearchParams(window.location.search)
  const result = query.get('payResult')
  if (result !== 'success' && result !== 'fail') return

  query.delete('payResult')
  const search = query.toString()
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}#/pay-result/${result}`,
  )
}

normalizePaymentResultRoute()
export const startParam = resolveStartParam()
const destinationSelectorToken = parseDestinationSelectorStartParam(startParam)

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
  if (startParam === 'mmode' || startParam === 'msubscription') return 'master'
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

/**
 * Тест-страница жеста свайпа. Внутри Max адресную строку не открыть, поэтому
 * два входа: deep link `?startapp=swipetest` (ссылку можно отправить себе в чат)
 * и пункт «Тест свайпов» на экране «Другое».
 */
function isSwipeTestHash() {
  if (typeof window === 'undefined') return false
  if (startParam === 'swipetest') return true
  const hash = window.location.hash || ''
  return hash.startsWith('#/swipe-test')
}

export default function App() {
  const [mode, setMode] = useState<'master' | 'client' | null>(resolveInitialMode)

  // Свайп вниз в шторке Max закрывает мини-приложение — гасим нативный жест.
  // Плюс горизонтальная «резина» WebView (не покрывается bridge-методом) — всегда.
  // Тест-страница #/swipe-test управляет вертикалью вручную, там не вмешиваемся.
  useEffect(() => {
    if (isSwipeTestHash()) return
    const stopVertical = keepVerticalSwipesDisabled()
    const stopHorizontal = installHorizontalOverscrollGuard()
    return () => { stopVertical(); stopHorizontal() }
  }, [])

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
  if (isSwipeTestHash()) return <SwipeTestPage />
  if (destinationSelectorToken) return <DestinationSelectorPage token={destinationSelectorToken} />

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

function MasterDeepLinkRedirect() {
  const navigate = useNavigate()
  const [target, setTarget] = useState(() => {
    if (startParam === 'msubscription') return '/subscription'
    const bookingId = getMasterBookingDeepLinkId()
    return bookingId ? `/bookings/${bookingId}` : null
  })

  useEffect(() => {
    if (!target) return
    navigate(target, { replace: true })
    setTarget(null)
  }, [navigate, target])

  return null
}

// Экраны результата оплаты — по URL возврата из hosted-формы T-Bank
// (макеты 10256-55423 / 10256-55004). Кнопки уводят обычной навигацией.
function PaySuccessRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const [returnTo] = useState(readSubscriptionReturn)
  useEffect(() => {
    trackEventOnce(`subscription-return:success:${location.key}`, 'subscription_payment_returned', { result: 'success' })
    if (returnTo) clearSubscriptionReturn()
  }, [location.key, returnTo])
  if (returnTo) return <Navigate to={returnTo} replace state={{ subscriptionReturn: true }} />
  return <SubscriptionSuccessPage onGoProfile={() => navigate('/', { replace: true })} />
}

function PayFailRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    trackEventOnce(`subscription-return:fail:${location.key}`, 'subscription_payment_returned', { result: 'fail' })
  }, [location.key])
  return (
    <SubscriptionFailedPage
      onRetry={() => navigate('/subscription', { replace: true })}
      onBack={() => {
        abandonSubscriptionReturn()
        navigate('/', { replace: true })
      }}
    />
  )
}

function MasterApp() {
  const { init, isLoading, master } = useAuthStore()
  // Кабинет мастера НЕ блокируется по подписке: при истёкшем триале недоступна
  // только клиентская онлайн-запись (плашка на главной + пейволл на создании записи).
  //
  // Результат оплаты: UI и данные разделены. Экран успеха/неуспеха рисуется
  // МАРШРУТОМ — T-Bank возвращает WebView с ?payResult=success|fail, который
  // при запуске нормализуется в #/pay-result/success|fail. Состояние — на бэке, источник
  // истины — нотификация T-Bank (+ GetState-синк как подстраховка); фронт
  // просто читает getMe, детект-эвристик здесь больше нет.

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!isLoading) {
      trackEventOnce('app_opened:master', 'app_opened', { app_mode: 'master', launch_source: resolveLaunchSource(startParam) })
    }
  }, [isLoading])

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

  // Новый мастер, не прошедший онбординг; или мастер не авторизован.
  // Онбординг сведён к велком-экрану: привязка карты → одобрение → кабинет
  // (профиль/расписание/услуги/клиент уже заведены пример-данными на бэке).
  const needsOnboarding = !master || !master.isOnboarded

  return (
    <BrowserRouter>
      <ScrollToTop />
      <MetricsPageTracker appMode="master" />
      <MasterDeepLinkRedirect />
      <Routes>
        {/* Велком-экран нового мастера: привязка карты → одобрение → кабинет */}
        <Route
          path="/welcome"
          element={needsOnboarding ? <WelcomePage /> : <Navigate to="/" replace />}
        />

        {/* Все остальные роуты — только после привязки карты (isOnboarded) */}
        <Route element={needsOnboarding ? <Navigate to="/welcome" replace /> : <Outlet />}>
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="income" element={<PaymentsPage />} />
            {/* «Другое» — полноценная вкладка: навбар виден, кнопки «назад» нет. */}
            <Route path="other" element={<OtherPage />} />
          </Route>

          {/* Возврат из hosted-формы оплаты T-Bank: query из SuccessURL/FailURL
              преобразуется в эти маршруты — экран результата рисуется по URL.
              Состояние подписки при этом обновляет бэкенд (нотификация T-Bank). */}
          <Route path="/pay-result/success" element={<PaySuccessRoute />} />
          <Route path="/pay-result/fail" element={<PayFailRoute />} />
          {/* Тест жеста свайпа — вход с экрана «Другое» (пре-роутерная проверка
              isSwipeTestHash при клиентской навигации уже не срабатывает). */}
          <Route path="/swipe-test" element={<SwipeTestPage />} />
          <Route path="/bookings/new" element={<CreateBookingPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutMePage />} />
          <Route path="/about-platform" element={<AboutPlatformPage />} />
          <Route path="/payment-methods" element={<PaymentMethodsPage />} />
          <Route path="/consents" element={<ConsentsPage />} />
          <Route path="/address" element={<AddressEditPage />} />
          <Route path="/subscription" element={<SubscriptionPlanPage />} />
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
