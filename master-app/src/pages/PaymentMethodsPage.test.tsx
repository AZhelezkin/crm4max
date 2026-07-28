import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSubscriptionState } from '@/test/fixtures/subscriptions'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'

const api = vi.hoisted(() => ({
  getMe: vi.fn(),
  rebindCard: vi.fn(),
}))

vi.mock('@/api/subscription.api', () => ({
  subscriptionApi: { getMe: api.getMe, rebindCard: api.rebindCard },
}))

import PaymentMethodsPage from './PaymentMethodsPage'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

describe('PaymentMethodsPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    api.getMe.mockReset()
    api.rebindCard.mockReset()
    api.getMe.mockResolvedValue(createSubscriptionState({ cardPan: '430000******0777' }))
    api.rebindCard.mockResolvedValue({ paymentURL: 'https://pay.test/rebind' })
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('показывает последние 4 цифры карты и префетчит URL перепривязки', async () => {
    renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })

    expect(await screen.findByText('** 0777')).toBeInTheDocument()
    expect(screen.getByText('Банковская карта')).toBeInTheDocument()
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledOnce())
  })

  it('не разрешает открыть rebind до загрузки subscription baseline', async () => {
    const webApp = installWebApp()
    const subscription = deferred<ReturnType<typeof createSubscriptionState>>()
    api.getMe.mockReturnValue(subscription.promise)
    renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledOnce())
    const edit = screen.getByRole('button', { name: 'Изменить карту' })

    expect(edit).toBeDisabled()
    fireEvent.click(edit)
    expect(webApp.openLink).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('subscription.pendingCardBinding')).toBeNull()

    await act(async () => subscription.resolve(createSubscriptionState({ cardPan: null })))
    expect(edit).toBeEnabled()
  })

  it('карандаш → диалог «Изменить карту» → открывает форму перепривязки', async () => {
    const webApp = installWebApp()
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await screen.findByText('** 0777')
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))
    expect(screen.getByText(/привязать новую карту для оплаты подписки/)).toBeInTheDocument()
    // Форма ещё не открыта — только диалог.
    expect(webApp.openLink).not.toHaveBeenCalled()

    // В диалоге две кнопки: подтверждение тоже называется «Изменить карту».
    const buttons = screen.getAllByRole('button', { name: 'Изменить карту' })
    const confirm = buttons[buttons.length - 1]
    await view.user.click(confirm)

    expect(webApp.openLink).toHaveBeenCalledWith('https://pay.test/rebind')
    // Открытие уже подготовленной формы не создаёт следующую AddCard-попытку:
    // иначе backend пометит текущий RequestKey устаревшим до завершения 3DS.
    expect(api.rebindCard).toHaveBeenCalledOnce()
  })

  it('«Отмена» в диалоге не открывает форму', async () => {
    const webApp = installWebApp()
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await screen.findByText('** 0777')

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))
    await view.user.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(webApp.openLink).not.toHaveBeenCalled()
    expect(screen.queryByText(/привязать новую карту/)).not.toBeInTheDocument()
  })

  it('без привязанной карты — «Не привязана», тап сразу открывает привязку', async () => {
    const webApp = installWebApp()
    api.getMe.mockResolvedValue(createSubscriptionState({ cardPan: null }))
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })

    expect(await screen.findByText('Не привязана')).toBeInTheDocument()
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))

    // Подтверждать нечего — форма привязки открывается сразу, без диалога.
    expect(screen.queryByText(/привязать новую карту/)).not.toBeInTheDocument()
    expect(webApp.openLink).toHaveBeenCalledWith('https://pay.test/rebind')
  })

  it('обновляет карту polling после возврата без visibilitychange', async () => {
    const oldState = createSubscriptionState({ cardPan: '430000******0777' })
    const newState = createSubscriptionState({ cardPan: '430000******1234' })
    api.getMe
      .mockResolvedValueOnce(oldState)
      .mockResolvedValueOnce(oldState)
      .mockResolvedValue(newState)
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await screen.findByText('** 0777')
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))
    const buttons = screen.getAllByRole('button', { name: 'Изменить карту' })
    const confirm = buttons[buttons.length - 1]
    vi.useFakeTimers()
    fireEvent.click(confirm)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('** 0777')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(2_000)
      await Promise.resolve()
    })
    expect(screen.getByText('** 1234')).toBeInTheDocument()
    expect(api.getMe).toHaveBeenCalledTimes(3)
  })

  it('завершает same-card reconciliation по server updatedAt при отстающих server clock', async () => {
    const baseline = createSubscriptionState({
      cardPan: '430000******0777',
      updatedAt: '2026-07-01T00:00:00.000Z',
    })
    const rebound = createSubscriptionState({
      cardPan: baseline.cardPan,
      // Серверное время новее baseline, но заведомо меньше client Date.now().
      updatedAt: '2026-07-02T00:00:00.000Z',
    })
    api.getMe
      .mockResolvedValueOnce(baseline)
      .mockResolvedValueOnce(baseline)
      .mockResolvedValue(rebound)
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await screen.findByText('** 0777')
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))
    const buttons = screen.getAllByRole('button', { name: 'Изменить карту' })
    vi.useFakeTimers()
    fireEvent.click(buttons[buttons.length - 1])
    await act(async () => { await Promise.resolve() })
    expect(sessionStorage.getItem('subscription.pendingCardBinding')).not.toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(2_000)
      await Promise.resolve()
    })
    expect(sessionStorage.getItem('subscription.pendingCardBinding')).toBeNull()
  })

  it('сохраняет marker после polling window и возобновляет sync по focus', async () => {
    const baseline = createSubscriptionState({ cardPan: null })
    const rebound = createSubscriptionState({ cardPan: '430000******1234' })
    api.getMe.mockResolvedValue(baseline)
    const webApp = installWebApp()
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await screen.findByText('Не привязана')
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledOnce())

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Изменить карту' }))
    expect(webApp.openLink).toHaveBeenCalled()
    await act(async () => { await Promise.resolve() })
    await act(async () => {
      vi.advanceTimersByTime(3 * 60_000 + 1)
      await Promise.resolve()
    })
    expect(sessionStorage.getItem('subscription.pendingCardBinding')).not.toBeNull()

    api.getMe.mockResolvedValue(rebound)
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })
    expect(sessionStorage.getItem('subscription.pendingCardBinding')).toBeNull()
  })

  it('после ошибки prefetch повторяет запрос по клику вместо no-op', async () => {
    const webApp = installWebApp()
    api.getMe.mockResolvedValue(createSubscriptionState({ cardPan: null }))
    api.rebindCard
      .mockRejectedValueOnce(new Error('prefetch unavailable'))
      .mockResolvedValueOnce({ paymentURL: 'https://pay.test/retry' })
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось подготовить привязку карты')
    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))

    expect(webApp.openLink).toHaveBeenCalledWith('https://pay.test/retry')
  })
})
