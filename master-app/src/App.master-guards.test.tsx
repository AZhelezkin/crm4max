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
  subscription?: SubscriptionState | null
}

async function loadGuardApp({
  master = createMasterProfile(),
  isLoading = false,
  hash = '#/',
  subscription = createSubscriptionState(),
}: GuardAppSetup = {}) {
  vi.resetModules()
  window.history.replaceState(null, '', `/${hash}`)
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

  it('не возвращает onboarded мастера на welcome', async () => {
    const { App } = await loadGuardApp({ hash: '#/welcome' })

    render(<App />)

    expect(await screen.findByTestId('master-home')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/')
  })

  it('перекрывает кабинет экраном заблокированной подписки', async () => {
    const { App } = await loadGuardApp({
      subscription: createSubscriptionState({ status: 'BLOCKED', hasAccess: false }),
    })

    render(<App />)

    expect(await screen.findByTestId('subscription-plan')).toBeInTheDocument()
    expect(screen.queryByTestId('master-home')).not.toBeInTheDocument()
  })

  it('показывает success после pending оплаты и очищает markers', async () => {
    localStorage.setItem('sub:payPending', '1')
    localStorage.setItem('sub:preErr', 'old-error')
    const { App } = await loadGuardApp({
      subscription: createSubscriptionState({ status: 'ACTIVE', lastChargeError: null }),
    })

    render(<App />)

    expect(await screen.findByTestId('subscription-success')).toBeInTheDocument()
    expect(localStorage.getItem('sub:payPending')).toBeNull()
    expect(localStorage.getItem('sub:preErr')).toBeNull()
  })

  it('переходит из payment success на главную', async () => {
    const user = userEvent.setup()
    localStorage.setItem('sub:payPending', '1')
    const { App } = await loadGuardApp()

    render(<App />)
    await user.click(await screen.findByTestId('subscription-success'))

    expect(await screen.findByTestId('master-home')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/')
  })

  it('показывает failure только для новой ошибки оплаты', async () => {
    localStorage.setItem('sub:payPending', '1')
    localStorage.setItem('sub:preErr', 'old-error')
    const { App } = await loadGuardApp({
      subscription: createSubscriptionState({
        status: 'GRACE',
        hasAccess: true,
        lastChargeError: 'new-error',
      }),
    })

    render(<App />)

    expect(await screen.findByTestId('subscription-failed')).toBeInTheDocument()
    expect(localStorage.getItem('sub:payPending')).toBeNull()
    expect(localStorage.getItem('sub:preErr')).toBeNull()
  })

  it('не считает старую payment error новым failure', async () => {
    localStorage.setItem('sub:payPending', '1')
    localStorage.setItem('sub:preErr', 'same-error')
    const { App, getMe } = await loadGuardApp({
      subscription: createSubscriptionState({
        status: 'GRACE',
        hasAccess: true,
        lastChargeError: 'same-error',
      }),
    })

    render(<App />)

    await waitFor(() => expect(getMe).toHaveBeenCalledOnce())
    expect(screen.getByTestId('master-home')).toBeInTheDocument()
    expect(screen.queryByTestId('subscription-failed')).not.toBeInTheDocument()
    expect(localStorage.getItem('sub:payPending')).toBe('1')
  })

  it('удаляет focus и visibility listeners при unmount', async () => {
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener')
    const removeWindowListener = vi.spyOn(window, 'removeEventListener')
    const { App, getMe } = await loadGuardApp()
    const view = render(<App />)

    await waitFor(() => expect(getMe).toHaveBeenCalledOnce())
    window.dispatchEvent(new Event('focus'))
    await waitFor(() => expect(getMe).toHaveBeenCalledTimes(2))

    view.unmount()
    window.dispatchEvent(new Event('focus'))

    expect(getMe).toHaveBeenCalledTimes(2)
    expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(removeWindowListener).toHaveBeenCalledWith('focus', expect.any(Function))
  })
})
