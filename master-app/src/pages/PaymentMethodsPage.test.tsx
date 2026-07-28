import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSubscriptionState } from '@/test/fixtures/subscriptions'
import { renderAtRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getMe: vi.fn(),
  rebindCard: vi.fn(),
}))

vi.mock('@/api/subscription.api', () => ({
  subscriptionApi: { getMe: api.getMe, rebindCard: api.rebindCard },
}))
const paymentForm = vi.hoisted(() => ({ openPaymentForm: vi.fn() }))
vi.mock('@/lib/paymentForm', () => paymentForm)

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
    paymentForm.openPaymentForm.mockReset()
    api.getMe.mockResolvedValue(createSubscriptionState({ cardPan: '430000******0777' }))
    api.rebindCard.mockResolvedValue({ paymentURL: 'https://pay.test/rebind' })
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('показывает последние 4 цифры карты и не создаёт AddCard до клика', async () => {
    renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })

    expect(await screen.findByText('** 0777')).toBeInTheDocument()
    expect(screen.getByText('Банковская карта')).toBeInTheDocument()
    expect(api.rebindCard).not.toHaveBeenCalled()
  })

  it('не разрешает открыть rebind до загрузки subscription baseline', async () => {
    const subscription = deferred<ReturnType<typeof createSubscriptionState>>()
    api.getMe.mockReturnValue(subscription.promise)
    renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    const edit = screen.getByRole('button', { name: 'Изменить карту' })

    expect(edit).toBeDisabled()
    fireEvent.click(edit)
    expect(paymentForm.openPaymentForm).not.toHaveBeenCalled()
    expect(api.rebindCard).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('subscription.pendingCardBinding')).toBeNull()

    await act(async () => subscription.resolve(createSubscriptionState({ cardPan: null })))
    expect(edit).toBeEnabled()
  })

  it('карандаш → диалог «Изменить карту» → открывает форму перепривязки', async () => {
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await screen.findByText('** 0777')

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))
    expect(screen.getByText(/привязать новую карту для оплаты подписки/)).toBeInTheDocument()
    // Форма ещё не открыта — только диалог.
    expect(paymentForm.openPaymentForm).not.toHaveBeenCalled()

    // В диалоге две кнопки: подтверждение тоже называется «Изменить карту».
    const buttons = screen.getAllByRole('button', { name: 'Изменить карту' })
    const confirm = buttons[buttons.length - 1]
    await view.user.click(confirm)

    await waitFor(() => expect(paymentForm.openPaymentForm).toHaveBeenCalledWith('https://pay.test/rebind'))
    expect(api.rebindCard).toHaveBeenCalledOnce()
  })

  it('«Отмена» в диалоге не открывает форму', async () => {
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await screen.findByText('** 0777')

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))
    await view.user.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(paymentForm.openPaymentForm).not.toHaveBeenCalled()
    expect(screen.queryByText(/привязать новую карту/)).not.toBeInTheDocument()
  })

  it('без привязанной карты — «Не привязана», тап сразу открывает привязку', async () => {
    api.getMe.mockResolvedValue(createSubscriptionState({ cardPan: null }))
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })

    expect(await screen.findByText('Не привязана')).toBeInTheDocument()
    expect(api.rebindCard).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))

    // Подтверждать нечего — форма привязки открывается сразу, без диалога.
    expect(screen.queryByText(/привязать новую карту/)).not.toBeInTheDocument()
    await waitFor(() => expect(paymentForm.openPaymentForm).toHaveBeenCalledWith('https://pay.test/rebind'))
    expect(api.rebindCard).toHaveBeenCalledOnce()
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
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await screen.findByText('Не привязана')

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Изменить карту' }))
    await act(async () => { await Promise.resolve() })
    expect(paymentForm.openPaymentForm).toHaveBeenCalled()
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

  it('после ошибки AddCard повторяет запрос по следующему клику', async () => {
    api.getMe.mockResolvedValue(createSubscriptionState({ cardPan: null }))
    api.rebindCard
      .mockRejectedValueOnce(new Error('prefetch unavailable'))
      .mockResolvedValueOnce({ paymentURL: 'https://pay.test/retry' })
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })

    await screen.findByText('Не привязана')
    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось подготовить привязку карты')
    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))

    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledTimes(2))
    expect(paymentForm.openPaymentForm).toHaveBeenCalledWith('https://pay.test/retry')
  })
})
