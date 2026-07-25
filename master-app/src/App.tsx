import { useEffect, useState } from 'react'
import { HashRouter as BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { keepVerticalSwipesDisabled } from '@/lib/bridge'
import { installHorizontalOverscrollGuard } from '@/lib/topOverscrollGuard'
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
import { subscriptionApi } from '@/api/subscription.api'
import DestinationSelectorPage from '@/standalone-pages/handoff/destination-selector/DestinationSelectorPage'
import { parseDestinationSelectorStartParam } from '@/standalone-pages/handoff/destination-selector/route'

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
  return <HomePage />
}

function MasterApp() {
  const { init, isLoading, master } = useAuthStore()
  // Кабинет мастера НЕ блокируется по подписке: при истёкшем триале недоступна
  // только клиентская онлайн-запись (плашка на главной + пейволл на создании записи).
  // Только что оплатил (флаг sub:payPending выставлен при открытии hosted-формы) и
  // статус стал ACTIVE → экран «Подписка оформлена!» (макет 10256-55423).
  const [paidJustNow, setPaidJustNow] = useState(false)
  // Оплата не прошла (статус не ACTIVE, появилась новая ошибка списания) →
  // экран «Оплата не прошла» (макет 10256-55004).
  const [payFailed, setPayFailed] = useState(false)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!master?.isOnboarded) return
    // Проверяем статус подписки при старте И при каждом возврате в приложение
    // (visibilitychange/focus). После оплаты во внешнем браузере T-Bank мастер
    // возвращается в тот же инстанс мини-аппа — без перепроверки результат
    // оплаты не показался бы, хотя подписка уже ACTIVE.
    let checking = false
    const check = () => {
      if (checking) return
      checking = true
      subscriptionApi.getMe()
        .then((s) => {
          if (localStorage.getItem('sub:payPending')) {
            const clearMarkers = () => {
              localStorage.removeItem('sub:payPending')
              localStorage.removeItem('sub:preErr')
              localStorage.removeItem('sub:payOpenedAt')
            }
            // Неуспех: не ACTIVE и (новая ошибка списания ИЛИ повтор той же —
            // REJECTED-нотификация обновляет подписку после открытия формы).
            const payOpenedAt = localStorage.getItem('sub:payOpenedAt') ?? ''
            const newError = !!s?.lastChargeError && s.lastChargeError !== (localStorage.getItem('sub:preErr') ?? '')
            const sameErrorAgain = !!s?.lastChargeError && !!payOpenedAt && !!s.updatedAt && s.updatedAt > payOpenedAt
            if (s?.status === 'ACTIVE') {
              // Успех: подписка оформлена.
              clearMarkers()
              setPaidJustNow(true)
            } else if (newError || sameErrorAgain) {
              clearMarkers()
              setPayFailed(true)
            }
          }
        })
        .catch(() => {})
        .finally(() => { checking = false })
    }
    // Max НЕ шлёт visibilitychange/focus при возврате из внешнего браузера
    // (WebView остаётся «visible» под ним) — поэтому события дополняет тикер:
    // каждые 3с смотрим localStorage (без сети) и, пока «оплата открыта» и не
    // старше 10 минут, опрашиваем статус. Ловит и установку флага после mount,
    // и «оплату в полёте» (банк подтверждает через ~20-30с после возврата).
    const tick = () => {
      if (!localStorage.getItem('sub:payPending')) return
      const opened = Date.parse(localStorage.getItem('sub:payOpenedAt') ?? '')
      if (Number.isFinite(opened) && Date.now() - opened > 10 * 60 * 1000) return
      check()
    }
    const interval = window.setInterval(tick, 3000)
    check()
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
      window.clearInterval(interval)
    }
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

  // Новый мастер, не прошедший онбординг; или мастер не авторизован.
  // Онбординг сведён к велком-экрану: привязка карты → одобрение → кабинет
  // (профиль/расписание/услуги/клиент уже заведены пример-данными на бэке).
  const needsOnboarding = !master || !master.isOnboarded

  // Успех оплаты (макет 10256-55423) — поверх кабинета, до гейта блокировки.
  // «Перейти в профиль» ведёт на главную (новый кабинет мастера).
  if (!needsOnboarding && paidJustNow) {
    return (
      <SubscriptionSuccessPage
        onGoProfile={() => { window.location.hash = '#/'; setPaidJustNow(false) }}
      />
    )
  }

  // Неуспех оплаты (макет 10256-55004). «Повторить оплату» открывает экран «Подписка».
  if (!needsOnboarding && payFailed) {
    return (
      <SubscriptionFailedPage
        onRetry={() => { window.location.hash = '#/subscription'; setPayFailed(false) }}
        onBack={() => setPayFailed(false)}
      />
    )
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Велком-экран нового мастера: привязка карты → одобрение → кабинет */}
        <Route
          path="/welcome"
          element={needsOnboarding ? <WelcomePage /> : <Navigate to="/" replace />}
        />

        {/* Все остальные роуты — только после привязки карты (isOnboarded) */}
        <Route element={needsOnboarding ? <Navigate to="/welcome" replace /> : <Outlet />}>
          <Route element={<MainLayout />}>
            <Route index element={<MasterIndexRoute />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="income" element={<PaymentsPage />} />
            {/* «Другое» — полноценная вкладка: навбар виден, кнопки «назад» нет. */}
            <Route path="other" element={<OtherPage />} />
          </Route>

          {/* Тест жеста свайпа — вход с экрана «Другое» (пре-роутерная проверка
              isSwipeTestHash при клиентской навигации уже не срабатывает). */}
          <Route path="/swipe-test" element={<SwipeTestPage />} />
          <Route path="/bookings/new" element={<CreateBookingPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutMePage />} />
          <Route path="/about-platform" element={<AboutPlatformPage />} />
          <Route path="/payment-methods" element={<PaymentMethodsPage />} />
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
