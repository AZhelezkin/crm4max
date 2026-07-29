import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterProfile } from '@/test/fixtures/masters'
import { createSubscriptionState } from '@/test/fixtures/subscriptions'
import { installBrowserFixture } from '@/test/browser-fixture'
import { renderAtRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getMe: vi.fn(),
  pay: vi.fn(),
  startTrial: vi.fn(),
  cancel: vi.fn(),
}))

vi.mock('@/api/subscription.api', () => ({
  subscriptionApi: {
    getMe: api.getMe,
    pay: api.pay,
    startTrial: api.startTrial,
    cancel: api.cancel,
  },
}))
const paymentForm = vi.hoisted(() => ({ openPaymentForm: vi.fn(), openCardBindingForm: vi.fn() }))
vi.mock('@/lib/paymentForm', () => paymentForm)

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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

describe('master onboarding subscription screens', () => {
  beforeEach(() => {
    api.getMe.mockReset()
    api.pay.mockReset()
    api.startTrial.mockReset()
    api.cancel.mockReset()
    paymentForm.openPaymentForm.mockReset()
    paymentForm.openCardBindingForm.mockReset()
    localStorage.clear()
    sessionStorage.clear()
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

  it('показывает trial days и не создаёт платёж до нажатия', async () => {
    renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByText(/дней пробного/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ежегодно/ })).toHaveStyle({
      border: '1px solid var(--color-selected-surface)',
    })
    expect(api.pay).not.toHaveBeenCalled()
    expect(api.startTrial).not.toHaveBeenCalled()
    expect(api.getMe).toHaveBeenCalledOnce()
  })

  it('не показывает выбор тарифа до загрузки состояния подписки', async () => {
    const subscription = deferred<ReturnType<typeof createSubscriptionState>>()
    api.getMe.mockReturnValue(subscription.promise)
    renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    expect(screen.queryByText('Выберите период подписки')).not.toBeInTheDocument()

    await act(async () => subscription.resolve(createSubscriptionState({ status: 'ACTIVE' })))
    expect(await screen.findByText('Подписка оформлена 🎉')).toBeInTheDocument()
  })

  it('возвращается с подписки на предыдущий внутренний экран', async () => {
    window.history.replaceState({ idx: 1 }, '')
    const view = renderAtRoute(<SubscriptionPlanPage />, {
      entries: ['/other', '/subscription'],
    })

    await view.user.click(await screen.findByRole('button', { name: 'Назад' }))

    expect(view.getLocation().pathname).toBe('/other')
    window.history.replaceState({ idx: 0 }, '')
  })

  it('при прямом открытии подписки сохраняет fallback на главную', async () => {
    window.history.replaceState({ idx: 0 }, '')
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    await view.user.click(await screen.findByRole('button', { name: 'Назад' }))

    expect(view.getLocation().pathname).toBe('/')
  })

  it('в триале: month plan → «Подключить» открывает оплату в том же WebView', async () => {
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })
    await screen.findByText('3')

    await view.user.click(screen.getByRole('button', { name: /Ежемесячно/ }))
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))

    expect(screen.queryByText('Необходимые согласия')).not.toBeInTheDocument()
    await waitFor(() => expect(paymentForm.openPaymentForm).toHaveBeenCalledWith('https://pay.test/month'))
    expect(api.pay).toHaveBeenCalledOnce()
    expect(api.pay).toHaveBeenCalledWith('MONTH')
    expect(api.startTrial).not.toHaveBeenCalled()
    expect(view.getLocation().pathname).toBe('/subscription')
    expect(sessionStorage.getItem('subscription.pendingCardBinding')).toBeNull()
  })

  it('не создаёт дублирующий Init при повторном клике во время запроса', async () => {
    const monthly = deferred<{ paymentURL: string }>()
    api.pay.mockReturnValue(monthly.promise)
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })
    await screen.findByText('3')

    await view.user.click(screen.getByRole('button', { name: /Ежемесячно/ }))
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))
    await view.user.click(screen.getByRole('button', { name: 'Подготавливаем...' }))
    expect(api.pay).toHaveBeenCalledOnce()
    expect(api.pay).toHaveBeenCalledWith('MONTH')

    await act(async () => monthly.resolve({ paymentURL: 'https://pay.test/month-deferred' }))

    expect(paymentForm.openPaymentForm).toHaveBeenCalledWith('https://pay.test/month-deferred')
  })

  it('вне триала (GRACE) открывает оплату в том же WebView (openPaymentForm)', async () => {
    api.getMe.mockResolvedValue(createSubscriptionState({
      status: 'GRACE',
      lastChargeError: 'old-charge-error',
    }))
    const open = vi.mocked(window.open)
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })
    await screen.findByText('пробный период закончился')

    await view.user.click(screen.getByRole('button', { name: /Подключить|Далее/ }))

    // Оплата — навигация того же WebView (SuccessURL вернёт через payResult),
    // НЕ внешний браузер.
    await waitFor(() => expect(paymentForm.openPaymentForm).toHaveBeenCalledWith('https://pay.test/year'))
    expect(open).not.toHaveBeenCalled()
    expect(api.pay.mock.calls.filter(([period]) => period === 'YEAR')).toHaveLength(1)
    // Остаёмся на месте — WebView уходит на форму сам.
    expect(view.getLocation().pathname).toBe('/subscription')
  })

  it('ACTIVE (макет 10352-43925): оформлена, дата списания, оплаченный план, без «Подключить»', async () => {
    api.getMe.mockResolvedValue(createSubscriptionState({
      status: 'ACTIVE',
      // Полдень UTC — локальная дата одинакова в любом поясе тестовой машины.
      currentPeriodEnd: '2027-07-28T12:00:00.000Z',
      plannedPeriod: 'YEAR',
      autoRenewEnabled: true,
      cardPan: null,
    }))
    renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    expect(await screen.findByText('Подписка оформлена 🎉')).toBeInTheDocument()
    expect(screen.getByText('Следующий платёж спишется 28.07.2027')).toBeInTheDocument()
    // Карточка оплаченного плана — только годовая, без выбора.
    expect(screen.getByText('Ежегодно')).toBeInTheDocument()
    expect(screen.getByText('4 790 ₽ / год')).toBeInTheDocument()
    expect(screen.queryByText('Ежемесячно')).not.toBeInTheDocument()
    expect(screen.queryByText('Выберите период подписки')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Подключить|Далее/ })).not.toBeInTheDocument()
    // Префетч оплаты не дёргается — не плодим NEW-платежи на бэке.
    expect(api.pay).not.toHaveBeenCalled()
    expect(api.startTrial).not.toHaveBeenCalled()
  })

  it('«Отменить подписку» → диалог (10352-44386) → cancel, статус «активна до…»', async () => {
    api.getMe
      .mockResolvedValueOnce(createSubscriptionState({
        status: 'ACTIVE',
        currentPeriodEnd: '2027-07-28T12:00:00.000Z',
        plannedPeriod: 'YEAR',
        autoRenewEnabled: true,
        cardPan: '430000******0777',
      }))
      // Перечитка после cancel: карта отвязана.
      .mockResolvedValueOnce(createSubscriptionState({
        status: 'ACTIVE',
        currentPeriodEnd: '2027-07-28T12:00:00.000Z',
        plannedPeriod: 'YEAR',
        autoRenewEnabled: false,
        cardPan: null,
      }))
    api.cancel.mockResolvedValue({ ok: true })
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    await view.user.click(await screen.findByRole('button', { name: 'Отменить подписку' }))
    expect(screen.getByText(/Новые списания производиться не будут/)).toBeInTheDocument()
    expect(screen.getByText(/Для годовой подписки проверим сумму возврата за неиспользованные месяцы/)).toBeInTheDocument()
    // «Закрыть» — отказ от отмены.
    expect(api.cancel).not.toHaveBeenCalled()

    // Подтверждение — вторая кнопка «Отменить подписку» (в диалоге).
    const cancelButtons = screen.getAllByRole('button', { name: 'Отменить подписку' })
    await view.user.click(cancelButtons[cancelButtons.length - 1])

    expect(api.cancel).toHaveBeenCalledOnce()
    expect(await screen.findByText('Подписка отменена')).toBeInTheDocument()
    expect(await screen.findByText('Подписка активна до 28.07.2027')).toBeInTheDocument()
    expect(screen.queryByText('Подписка оформлена 🎉')).not.toBeInTheDocument()
    // Кнопка отмены исчезла — подписка уже отменена.
    expect(screen.queryByRole('button', { name: 'Отменить подписку' })).not.toBeInTheDocument()
  })

  it('не обещает возврат для месячной подписки', async () => {
    api.getMe.mockResolvedValue(createSubscriptionState({
      status: 'ACTIVE',
      plannedPeriod: 'MONTH',
      autoRenewEnabled: true,
    }))
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    await view.user.click(await screen.findByRole('button', { name: 'Отменить подписку' }))

    expect(screen.queryByText(/Для годовой подписки проверим сумму возврата за неиспользованные месяцы/)).not.toBeInTheDocument()
    expect(screen.getByText(/Доступ к сервису сохранится до конца текущего оплаченного месяца/)).toBeInTheDocument()
  })

  it('для отменённой подписки показывает тарифы и открывает AddCard вне WebView', async () => {
    api.getMe.mockResolvedValue(createSubscriptionState({
      status: 'ACTIVE',
      currentPeriodEnd: '2026-08-20T12:00:00.000Z',
      plannedPeriod: 'YEAR',
      autoRenewEnabled: false,
      cardPan: null,
    }))
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    expect(await screen.findByText('Подписка отменена')).toBeInTheDocument()
    expect(screen.getByText('Подписка активна до 20.08.2026')).toBeInTheDocument()
    expect(screen.getByText('Выберите период подписки')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: /Ежемесячно/ }))
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))

    expect(api.startTrial).toHaveBeenCalledWith('MONTH')
    expect(api.pay).not.toHaveBeenCalled()
    expect(paymentForm.openCardBindingForm).toHaveBeenCalledWith('https://trial.test/month')
    expect(paymentForm.openPaymentForm).not.toHaveBeenCalled()
  })

  it('для уже истёкшего оплаченного периода проводит новую оплату, а не AddCard', async () => {
    api.getMe.mockResolvedValue(createSubscriptionState({
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() - 86_400_000).toISOString(),
      plannedPeriod: 'YEAR',
      autoRenewEnabled: false,
      onlineBookingAvailable: false,
      cardPan: null,
    }))
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    expect(await screen.findByText('Выберите период подписки')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Далее' }))

    expect(api.pay).toHaveBeenCalledWith('YEAR')
    expect(api.startTrial).not.toHaveBeenCalled()
    expect(paymentForm.openPaymentForm).toHaveBeenCalledWith('https://pay.test/year')
    expect(paymentForm.openCardBindingForm).not.toHaveBeenCalled()
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

  it('после ошибки оплаты повторяет запрос и открывает форму', async () => {
    api.pay
      .mockRejectedValueOnce(new Error('payment unavailable'))
      .mockResolvedValueOnce({ paymentURL: 'https://pay.test/retry' })
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    await screen.findByText('3')
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось подготовить оплату')
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))
    await waitFor(() => expect(api.pay).toHaveBeenCalledTimes(2))

    await waitFor(() => expect(paymentForm.openPaymentForm).toHaveBeenCalledWith('https://pay.test/retry'))
    expect(view.getLocation().pathname).toBe('/subscription')
  })

  it('объясняет необходимость телефона для чека', async () => {
    api.pay.mockRejectedValue({
      response: { data: { error: 'SUBSCRIPTION_CONTACT_REQUIRED' } },
    })
    const view = renderAtRoute(<SubscriptionPlanPage />, { route: '/subscription' })

    await screen.findByText('3')
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Для оплаты укажите номер телефона в разделе «Обо мне».',
    )
    expect(paymentForm.openPaymentForm).not.toHaveBeenCalled()
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
