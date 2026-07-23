import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterProfile } from '@/test/fixtures/masters'
import { createSubscriptionState } from '@/test/fixtures/subscriptions'
import { installBrowserFixture } from '@/test/browser-fixture'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'

const api = vi.hoisted(() => ({
  getMe: vi.fn(),
  pay: vi.fn(),
  startTrial: vi.fn(),
}))

vi.mock('@/api/subscription.api', () => ({
  subscriptionApi: {
    getMe: api.getMe,
    pay: api.pay,
    startTrial: api.startTrial,
  },
}))
vi.mock('qrcode.react', async () => {
  const { forwardRef } = await vi.importActual<typeof import('react')>('react')
  return {
    QRCodeCanvas: forwardRef<HTMLCanvasElement, { value: string }>(({ value }, ref) => (
      <canvas ref={ref} data-qr-value={value} />
    )),
  }
})

import { useAuthStore } from '@/store/auth.store'

import SubscriptionFailedPage from './SubscriptionFailedPage'
import SubscriptionPlanPage from './SubscriptionPlanPage'
import SubscriptionSuccessPage from './SubscriptionSuccessPage'

function setMaster(master = createMasterProfile()) {
  useAuthStore.setState({ token: 'master-token', master, isLoading: false })
  return master
}

describe('master onboarding subscription screens', () => {
  beforeEach(() => {
    api.getMe.mockReset()
    api.pay.mockReset()
    api.startTrial.mockReset()
    localStorage.clear()
    api.getMe.mockResolvedValue(createSubscriptionState({
      status: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 2.1 * 86_400_000).toISOString(),
    }))
    api.pay.mockImplementation((period: 'MONTH' | 'YEAR') => Promise.resolve({
      paymentURL: `https://pay.test/${period.toLowerCase()}`,
    }))
    api.startTrial.mockImplementation((period: 'MONTH' | 'YEAR') => Promise.resolve({
      paymentURL: `https://trial.test/${period.toLowerCase()}`,
    }))
    setMaster()
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('показывает trial days и prefetch привязки карты (без списания) на default yearly', async () => {
    renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByText(/дней пробного/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ежегодно/ })).toHaveStyle({
      border: '1px solid var(--color-selected-surface)',
    })
    // В триале «Подключить» — привязка карты без списания (startTrial), не оплата.
    await waitFor(() => expect(api.startTrial).toHaveBeenCalledWith('YEAR'))
    expect(api.pay).not.toHaveBeenCalled()
    expect(api.getMe).toHaveBeenCalledOnce()
  })

  it('в триале: month plan, оба согласия → привязка карты без списания, в кабинет', async () => {
    const webApp = installWebApp()
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })
    await waitFor(() => expect(api.startTrial).toHaveBeenCalledWith('YEAR'))

    await view.user.click(screen.getByRole('button', { name: /Ежемесячно/ }))
    await waitFor(() => expect(api.startTrial).toHaveBeenCalledWith('MONTH'))
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))
    expect(screen.getByText('Необходимые согласия')).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))
    expect(webApp.openLink).not.toHaveBeenCalled()
    expect(view.getLocation().pathname).toBe('/subscription')

    await view.user.click(screen.getByRole('button', { name: /Я принимаю условия/ }))
    await view.user.click(screen.getByRole('button', { name: /Я даю согласие/ }))
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))

    // Форма привязки карты (не оплаты); флаги результата оплаты не ставятся; → кабинет.
    expect(webApp.openLink).toHaveBeenCalledWith('https://trial.test/month')
    expect(api.pay).not.toHaveBeenCalled()
    expect(localStorage.getItem('sub:payPending')).toBeNull()
    expect(view.getLocation().pathname).toBe('/')
  })

  it('открывает default yearly URL через browser fallback ровно после согласий', async () => {
    api.getMe.mockResolvedValue(createSubscriptionState({
      status: 'GRACE',
      lastChargeError: 'old-charge-error',
    }))
    const open = vi.mocked(window.open)
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })
    await waitFor(() => expect(api.pay).toHaveBeenCalledWith('YEAR'))
    await view.user.click(screen.getByRole('button', { name: /Подключить|Далее/ }))
    await view.user.click(screen.getByRole('button', { name: /Я принимаю условия/ }))
    await view.user.click(screen.getByRole('button', { name: /Я даю согласие/ }))

    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))

    expect(open).toHaveBeenCalledWith('https://pay.test/year', '_blank')
    expect(api.pay.mock.calls.filter(([period]) => period === 'YEAR')).toHaveLength(1)
    expect(localStorage.getItem('sub:payPending')).toBe('1')
    expect(localStorage.getItem('sub:preErr')).toBe('old-charge-error')
  })

  it('показывает expired trial transition как Далее', async () => {
    api.getMe.mockResolvedValue(createSubscriptionState({
      status: 'TRIALING',
      trialEndsAt: new Date(Date.now() - 86_400_000).toISOString(),
    }))
    renderAtRoute(<SubscriptionPlanPage />)

    expect(await screen.findByText('пробный период закончился')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Далее' })).toBeInTheDocument()
  })

  it('возвращается с consent step к plan без payment effect', async () => {
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))

    await view.user.click(screen.getByRole('button', { name: 'Назад' }))

    expect(screen.getByText('Выберите период подписки')).toBeInTheDocument()
    expect(view.getLocation().pathname).toBe('/subscription')
    expect(localStorage.getItem('sub:payPending')).toBeNull()
  })

  it('остаётся failure-safe если subscription/payment reads недоступны', async () => {
    api.getMe.mockRejectedValue(new Error('subscription unavailable'))
    api.pay.mockRejectedValue(new Error('payment unavailable'))
    api.startTrial.mockRejectedValue(new Error('trial unavailable'))
    const webApp = installWebApp()
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })
    // sub не загрузился → URL не префетчится; проходим шаги — ничего вредного.
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))
    await view.user.click(screen.getByRole('button', { name: /Я принимаю условия/ }))
    await view.user.click(screen.getByRole('button', { name: /Я даю согласие/ }))
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))

    expect(webApp.openLink).not.toHaveBeenCalled()
    expect(view.getLocation().pathname).toBe('/subscription')
    expect(localStorage.getItem('sub:payPending')).toBeNull()
  })

  it('SubscriptionSuccessPage строит QR/share contract и ведёт в профиль', async () => {
    const master = setMaster(createMasterProfile({ name: 'Анна Мастерова' }))
    const browser = installBrowserFixture()
    const onGoProfile = vi.fn()
    const view = renderAtRoute(<SubscriptionSuccessPage onGoProfile={onGoProfile} />)
    const deepLink = `https://max.ru/id9706002253_1_bot?start=${master.id}`

    expect(screen.getByText('Подписка оформлена!')).toBeInTheDocument()
    expect(document.querySelector('canvas')).toHaveAttribute('data-qr-value', deepLink)
    await view.user.click(screen.getByRole('button', { name: /Поделиться/ }))
    expect(browser.share).toHaveBeenCalledWith({
      title: 'Анна Мастерова',
      text: 'Записывайтесь ко мне через Max: Анна Мастерова',
      url: deepLink,
    })

    await view.user.click(screen.getByRole('button', { name: 'Перейти в профиль' }))
    expect(onGoProfile).toHaveBeenCalledOnce()
  })

  it('SubscriptionSuccessPage не создаёт QR без master identity', () => {
    useAuthStore.setState({ token: null, master: null, isLoading: false })
    renderAtRoute(<SubscriptionSuccessPage onGoProfile={() => {}} />)

    expect(screen.getByText('QR-код появится после авторизации')).toBeInTheDocument()
    expect(document.querySelector('canvas')).not.toBeInTheDocument()
  })

  it('SubscriptionFailedPage делегирует retry и back без скрытых effects', async () => {
    const onRetry = vi.fn()
    const onBack = vi.fn()
    const view = renderAtRoute(<SubscriptionFailedPage onRetry={onRetry} onBack={onBack} />)

    expect(screen.getByText('Оплата не прошла')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Повторить оплату' }))
    expect(onRetry).toHaveBeenCalledOnce()
    await view.user.click(screen.getByRole('button', { name: 'Назад' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
