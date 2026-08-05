import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Master } from '@/types'
import type { SubscriptionState } from '@/api/subscription.api'
import { createMasterProfile } from '@/test/fixtures/masters'
import { createSubscriptionState } from '@/test/fixtures/subscriptions'
import { installWebApp } from '@/test/web-app-fixture'

interface GuardAppSetup {
  master?: Master | null
  isLoading?: boolean
  hash?: string
  search?: string
  subscription?: SubscriptionState | null
  returnToBooking?: boolean
}

async function loadGuardApp({
  master = createMasterProfile(),
  isLoading = false,
  hash = '#/',
  search = '',
  subscription = createSubscriptionState(),
  returnToBooking = false,
}: GuardAppSetup = {}) {
  vi.resetModules()
  sessionStorage.clear()
  if (returnToBooking) {
    sessionStorage.setItem('subscription.returnTo', JSON.stringify({
      createdAt: Date.now(),
      value: '/bookings/new',
    }))
  }
  window.history.replaceState(null, '', `/${search}${hash}`)
  installWebApp({
    initData: 'signed-master-init',
    initDataUnsafe: { start_param: 'mmode' },
  })

  const getMe = vi.fn().mockResolvedValue(subscription)
  const init = vi.fn().mockResolvedValue(undefined)

  vi.doMock('@client/ClientApp', () => ({ default: () => <div data-testid="client-app" /> }))
  vi.doMock('@/components/ScrollToTop', () => ({ default: () => null }))
  vi.doMock('@/components/MainLayout', async () => {
    const { Outlet } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
    return { default: () => <Outlet /> }
  })
  vi.doMock('@/pages/HomePage', () => ({ default: () => <div data-testid="master-home" /> }))
  vi.doMock('@/pages/SettingsPage', () => ({ default: () => <div data-testid="master-settings" /> }))
  vi.doMock('@/pages/WelcomePage', () => ({ default: () => <div data-testid="welcome" /> }))
  vi.doMock('@/pages/SubscriptionPlanPage', () => ({
    default: () => <div data-testid="subscription-plan" />,
  }))
  vi.doMock('@/pages/CreateBookingPage', () => ({
    default: () => <div data-testid="booking-create" />,
  }))
  vi.doMock('@/pages/SubscriptionSuccessPage', () => ({
    default: ({ onGoProfile }: { onGoProfile: () => void }) => (
      <button data-testid="subscription-success" onClick={onGoProfile}>В профиль</button>
    ),
  }))
  vi.doMock('@/pages/SubscriptionFailedPage', () => ({
    default: ({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) => (
      <div data-testid="subscription-failed">
        <button onClick={onRetry}>Повторить</button>
        <button onClick={onBack}>Назад</button>
      </div>
    ),
  }))
  vi.doMock('@/api/subscription.api', () => ({
    subscriptionApi: {
      getMe,
      startTrial: vi.fn(),
      pay: vi.fn(),
    },
  }))

  const { useAuthStore } = await import('@/store/auth.store')
  useAuthStore.setState({
    token: master ? 'master-test-token' : null,
    master,
    isLoading,
    init,
  })

  const { default: App } = await import('./App')
  return { App, getMe, init }
}

describe.sequential('App master guards', () => {
  it('показывает loading пока master auth не завершён', async () => {
    const { App } = await loadGuardApp({ isLoading: true })

    render(<App />)

    expect(screen.getByText('Загрузка...')).toBeInTheDocument()
  })

  it.each([
    ['отсутствующий профиль', null],
    ['не завершённый onboarding', createMasterProfile({ isOnboarded: false })],
  ])('перенаправляет на welcome: %s', async (_label, master) => {
    const { App } = await loadGuardApp({ master, hash: '#/settings' })

    render(<App />)

    expect(await screen.findByTestId('welcome')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/welcome')
  })

  it('сохраняет страницу согласий незавершённого мастера после reload', async () => {
    const { App } = await loadGuardApp({
      master: createMasterProfile({ isOnboarded: false }),
      hash: '#/welcome/consents',
    })

    render(<App />)

    expect(await screen.findByTestId('welcome')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/welcome/consents')
  })

  it('не возвращает onboarded мастера на welcome', async () => {
    const { App } = await loadGuardApp({ hash: '#/welcome' })

    render(<App />)

    expect(await screen.findByTestId('master-home')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/')
  })

  it('НЕ перекрывает кабинет при заблокированной подписке (функционал мастера не блочим)', async () => {
    const { App } = await loadGuardApp({
      subscription: createSubscriptionState({ status: 'BLOCKED', hasAccess: false }),
    })

    render(<App />)

    // Кабинет работает; ограничение только на клиентскую онлайн-запись
    // (плашка на главной + пейволл на подтверждении записи).
    expect(await screen.findByTestId('master-home')).toBeInTheDocument()
    expect(screen.queryByTestId('subscription-plan')).not.toBeInTheDocument()
  })

  // ── Результат оплаты — по URL возврата из hosted-формы T-Bank ──────────────
  // (SuccessURL/FailURL передают ?payResult=success|fail; приложение преобразует
  // query в hash-маршрут, состояние обновляет бэкенд по нотификации.)

  it('возврат с ?payResult=success рисует экран успеха; кнопка → главная', async () => {
    const user = userEvent.setup()
    const { App } = await loadGuardApp({ search: '?payResult=success' })

    render(<App />)

    expect(await screen.findByTestId('subscription-success')).toBeInTheDocument()
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#/pay-result/success')
    await user.click(screen.getByTestId('subscription-success'))
    expect(await screen.findByTestId('master-home')).toBeInTheDocument()
  })

  it('после оплаты из создания записи возвращает к сохранённому черновику', async () => {
    const { App } = await loadGuardApp({ search: '?payResult=success', returnToBooking: true })

    render(<StrictMode><App /></StrictMode>)

    expect(await screen.findByTestId('booking-create')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/bookings/new')
    expect(sessionStorage.getItem('subscription.returnTo')).toBeNull()
    expect(screen.queryByTestId('subscription-success')).not.toBeInTheDocument()
  })

  it('возврат с ?payResult=fail рисует экран неуспеха; retry → «Подписка»', async () => {
    const user = userEvent.setup()
    const { App } = await loadGuardApp({ search: '?payResult=fail' })

    render(<App />)

    expect(await screen.findByTestId('subscription-failed')).toBeInTheDocument()
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#/pay-result/fail')
    await user.click(screen.getByText('Повторить'))
    expect(await screen.findByTestId('subscription-plan')).toBeInTheDocument()
  })

  it('назад с экрана неуспеха ведёт в кабинет', async () => {
    const user = userEvent.setup()
    const { App } = await loadGuardApp({ hash: '#/pay-result/fail' })

    render(<App />)

    await user.click(await screen.findByText('Назад'))
    expect(await screen.findByTestId('master-home')).toBeInTheDocument()
  })
})
