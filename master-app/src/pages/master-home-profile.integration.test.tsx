import dayjs from 'dayjs'
import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterBooking } from '@/test/fixtures/bookings'
import { createMasterClient } from '@/test/fixtures/clients'
import { createMasterProfile } from '@/test/fixtures/masters'
import { createMasterService } from '@/test/fixtures/services'
import { createSubscriptionState } from '@/test/fixtures/subscriptions'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'

const api = vi.hoisted(() => ({
  listBookings: vi.fn(),
  listClients: vi.fn(),
  getSubscription: vi.fn(),
  paySubscription: vi.fn(),
  getMaster: vi.fn(),
  getReviews: vi.fn(),
}))

vi.mock('@/api/bookings.api', () => ({ bookingsApi: { list: api.listBookings } }))
vi.mock('@/api/clients.api', () => ({ clientsApi: { list: api.listClients } }))
vi.mock('@/api/subscription.api', () => ({
  subscriptionApi: { getMe: api.getSubscription, pay: api.paySubscription },
}))
vi.mock('@/api/masters.api', () => ({
  mastersApi: { getMe: api.getMaster, getReviews: api.getReviews },
}))

import { useAuthStore } from '@/store/auth.store'

import HomePage from './HomePage'

const TODAY = dayjs().format('YYYY-MM-DD')

function setMaster(master: ReturnType<typeof createMasterProfile> | null) {
  useAuthStore.setState({ token: 'master-token', master, isLoading: false })
}

function primeSuccessfulReads(master = createMasterProfile()) {
  api.listBookings.mockResolvedValue([])
  api.listClients.mockResolvedValue([])
  api.getSubscription.mockResolvedValue(createSubscriptionState())
  api.paySubscription.mockResolvedValue({ paymentURL: 'https://pay.test/subscription' })
  api.getMaster.mockResolvedValue(master)
  api.getReviews.mockResolvedValue([])
}

function deferred<T>() {
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((_, fail) => { reject = fail })
  return { promise, reject }
}

describe('master HomePage', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    vi.spyOn(window, 'open').mockImplementation(() => null)
    // Выбранный день полоски персистится в sessionStorage — чистим между тестами.
    sessionStorage.clear()
    primeSuccessfulReads()
    setMaster(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('после TTL pending marker делает обычный getMe, если reconciliation не ответил', async () => {
    vi.useFakeTimers()
    const initiatedAt = Date.now()
    sessionStorage.setItem('subscription.pendingCardBinding', JSON.stringify({
      baselineCardPan: null,
      baselineUpdatedAt: '2026-07-01T00:00:00.000Z',
      initiatedAt,
    }))
    const reconciliation = deferred<ReturnType<typeof createSubscriptionState>>()
    const fallback = createSubscriptionState({ status: 'ACTIVE' })
    api.getSubscription
      .mockReturnValueOnce(reconciliation.promise)
      .mockResolvedValueOnce(fallback)
    setMaster(createMasterProfile())
    renderAtRoute(<HomePage />)
    await act(async () => { await Promise.resolve() })
    expect(api.getSubscription).toHaveBeenCalledOnce()

    await act(async () => {
      vi.advanceTimersByTime(3 * 60_000)
      reconciliation.reject(new Error('reconciliation unavailable'))
      await Promise.resolve()
      vi.advanceTimersByTime(17 * 60_000 + 1)
      await Promise.resolve()
    })

    expect(api.getSubscription).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Подписка активна')).toBeInTheDocument()
    expect(sessionStorage.getItem('subscription.pendingCardBinding')).toBeNull()
  })

  it('показывает skeleton пока master не загружен', () => {
    const pending = new Promise(() => {})
    api.listBookings.mockReturnValue(pending)
    api.listClients.mockReturnValue(pending)
    api.getSubscription.mockReturnValue(pending)
    api.getMaster.mockReturnValue(pending)
    const home = renderAtRoute(<HomePage />)
    expect(home.container.querySelectorAll('.skeleton')).toHaveLength(9)
  })

  it('показывает skeleton записей и статуса подписки, пока ответы не пришли', async () => {
    const pending = new Promise(() => {})
    api.listBookings.mockReturnValue(pending)
    api.getSubscription.mockReturnValue(pending)
    api.listClients.mockReturnValue(pending)
    setMaster(createMasterProfile())

    const home = renderAtRoute(<HomePage />)

    // 3 строки-заглушки записей (линия + 2 времени + 2 текста + кебаб = 18) +
    // сводка дня (1) + статус подписки (2) + карточка «Клиенты»: число, 3 аватарки,
    // «ходят/не ходят» (5). Итого 26.
    await waitFor(() => expect(home.container.querySelectorAll('.skeleton').length).toBe(26))
    expect(screen.queryByText('В этот день нет записей')).not.toBeInTheDocument()
    expect(screen.queryByText(/ходят/)).not.toBeInTheDocument()
  })

  it('убирает skeleton записей, подписки и клиентов после ответа', async () => {
    api.listBookings.mockResolvedValue([])
    api.getSubscription.mockResolvedValue(createSubscriptionState({ status: 'ACTIVE' }))
    setMaster(createMasterProfile())

    const home = renderAtRoute(<HomePage />)

    expect(await screen.findByText('В этот день нет записей')).toBeInTheDocument()
    expect(screen.getByText('Подписка активна')).toBeInTheDocument()
    expect(screen.getByText('ходят 0, не ходят 0')).toBeInTheDocument()
    expect(home.container.querySelectorAll('.skeleton')).toHaveLength(0)
  })

  it('HomePage показывает authoritative summaries, фильтрует cancelled и сортирует время', async () => {
    const services = [
      createMasterService({ id: 'service-1', name: 'Стрижка' }),
      createMasterService({ id: 'service-2', name: 'Укладка' }),
    ]
    const master = createMasterProfile({ services })
    const clients = [
      createMasterClient({ id: 'client-1', name: 'Ранний клиент' }),
      createMasterClient({ id: 'client-2', name: 'Поздний клиент' }),
    ]
    api.listClients.mockResolvedValue(clients)
    api.listBookings.mockResolvedValue([
      createMasterBooking({
        id: 'booking-late',
        date: TODAY,
        time: '15:00',
        client: { id: 'client-2', name: 'Поздний клиент', phone: null, photo: null },
      }),
      createMasterBooking({
        id: 'booking-cancelled',
        date: TODAY,
        time: '08:00',
        status: 'CANCELLED',
        client: { id: 'client-3', name: 'Отменённый клиент', phone: null, photo: null },
      }),
      createMasterBooking({
        id: 'booking-early',
        date: TODAY,
        time: '10:00',
        client: { id: 'client-1', name: 'Ранний клиент', phone: null, photo: null },
      }),
    ])
    api.getSubscription.mockResolvedValue(createSubscriptionState({ status: 'ACTIVE' }))
    setMaster(master)

    renderAtRoute(<HomePage />)

    const early = await screen.findByText('Ранний клиент')
    const late = screen.getByText('Поздний клиент')
    expect(early.compareDocumentPosition(late) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Отменённую показываем в списке дня (красная линия статуса), но в сводку
    // дня она не входит — иначе счётчик и сумма считались бы по разным наборам.
    expect(screen.getByText('Отменённый клиент')).toBeInTheDocument()
    expect(screen.getByText(/2 записи на 5.?000 ₽/)).toBeInTheDocument()
    expect(screen.getByText('ходят 2, не ходят 0')).toBeInTheDocument()
    expect(screen.getByText('Подписка активна')).toBeInTheDocument()
    expect(screen.getByText('Вход со двора')).toBeInTheDocument()
  })

  it('HomePage сохраняет exact date route state для новой записи', async () => {
    setMaster(createMasterProfile())
    const view = renderAtRoute(<HomePage />)

    await view.user.click(screen.getByRole('button', { name: 'Создать запись' }))

    expect(view.getLocation().pathname).toBe('/bookings/new')
    expect(view.getLocation().state).toEqual({ date: TODAY })
  })

  it('HomePage открывает authoritative booking detail', async () => {
    api.listBookings.mockResolvedValue([
      createMasterBooking({
        id: 'booking-open',
        date: TODAY,
        client: { id: 'client-open', name: 'Открываемый клиент', phone: null, photo: null },
      }),
    ])
    setMaster(createMasterProfile())
    const view = renderAtRoute(<HomePage />)

    const client = await screen.findByText('Открываемый клиент')
    await view.user.click(client.closest('button')!)

    expect(view.getLocation().pathname).toBe('/bookings/booking-open')
  })

  it('HomePage остаётся failure-safe при ошибках reads', async () => {
    api.listBookings.mockRejectedValue(new Error('bookings unavailable'))
    api.listClients.mockRejectedValue(new Error('clients unavailable'))
    api.getSubscription.mockRejectedValue(new Error('subscription unavailable'))
    const profile = createMasterProfile({ services: [], location: null, locationNote: null })
    setMaster({ ...profile, schedule: { ...profile.schedule!, workingDays: [1, 2, 3, 4, 5, 6, 7] } })

    renderAtRoute(<HomePage />)

    // Текст пустого дня изменился вместе с календарём: «В этот день нет записей».
    expect(await screen.findByText('В этот день нет записей')).toBeInTheDocument()
    expect(screen.getByText('ходят 0, не ходят 0')).toBeInTheDocument()
    expect(screen.getByText('Не указан')).toBeInTheDocument()
  })

  it('клик по «Ближайшая запись» выбирает эту дату и показывает её запись', async () => {
    const nearDate = dayjs().add(10, 'day').format('YYYY-MM-DD')
    const nearMonday = dayjs(nearDate).subtract((dayjs(nearDate).day() + 6) % 7, 'day').format('YYYY-MM-DD')
    api.listBookings.mockResolvedValue([
      createMasterBooking({
        id: 'booking-near',
        date: nearDate,
        time: '11:00',
        client: { id: 'client-near', name: 'Далёкий клиент', phone: null, photo: null },
      }),
    ])
    setMaster(createMasterProfile())
    const view = renderAtRoute(<HomePage />)

    // Сегодня записей нет — показываем ссылку на ближайшую.
    expect(await screen.findByText('В этот день нет записей')).toBeInTheDocument()
    const link = screen.getByRole('button', { name: dayjs(nearDate).format('D MMMM') })

    await view.user.click(link)

    // Список показал запись этого дня, а полоска доскроллилась к его неделе.
    expect(await screen.findByText('Далёкий клиент')).toBeInTheDocument()
    expect(screen.getByTestId('week-strip')).toHaveAttribute('data-visible-week', nearMonday)
  })

  it('сохраняет выбранный день после ухода в карточку и возврата (remount)', async () => {
    const pickDate = dayjs().add(9, 'day').format('YYYY-MM-DD')
    const pickMonday = dayjs(pickDate).subtract((dayjs(pickDate).day() + 6) % 7, 'day').format('YYYY-MM-DD')
    api.listBookings.mockResolvedValue([
      createMasterBooking({
        id: 'booking-picked',
        date: pickDate,
        time: '13:00',
        client: { id: 'client-picked', name: 'Выбранный клиент', phone: null, photo: null },
      }),
    ])
    setMaster(createMasterProfile())

    // Первый заход: выбираем будущий день через ссылку «Ближайшая запись».
    const first = renderAtRoute(<HomePage />)
    await screen.findByText('В этот день нет записей')
    await first.user.click(screen.getByRole('button', { name: dayjs(pickDate).format('D MMMM') }))
    expect(await screen.findByText('Выбранный клиент')).toBeInTheDocument()
    first.unmount()

    // Возврат из карточки = свежий mount HomePage: день и неделя восстановлены.
    renderAtRoute(<HomePage />)
    expect(await screen.findByText('Выбранный клиент')).toBeInTheDocument()
    expect(screen.getByTestId('week-strip')).toHaveAttribute('data-visible-week', pickMonday)
  })

  it('плашка GRACE (оплаченный период) ведёт на экран подписки', async () => {
    const graceEndsAt = new Date(Date.now() + 3 * 86_400_000).toISOString()
    api.getSubscription.mockResolvedValue(createSubscriptionState({
      status: 'GRACE',
      graceEndsAt,
      currentPeriodEnd: new Date(Date.now() - 86_400_000).toISOString(),
      lastChargeError: 'insufficient_funds',
      hasAccess: true,
    }))
    setMaster(createMasterProfile())
    const view = renderAtRoute(<HomePage />)

    await view.user.click(await screen.findByRole('button', { name: /Не удалось оплатить подписку/ }))

    expect(view.getLocation().pathname).toBe('/subscription')
    // Оплату открывает уже экран подписки — с главной pay не дёргается.
    expect(api.paySubscription).not.toHaveBeenCalled()
  })

  it('плашка триала: остался 1 день → «Подключить» → экран подписки', async () => {
    api.getSubscription.mockResolvedValue(createSubscriptionState({
      status: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 0.9 * 86_400_000).toISOString(),
    }))
    setMaster(createMasterProfile())
    const view = renderAtRoute(<HomePage />)

    await view.user.click(await screen.findByRole('button', { name: /Пробный период заканчивается/ }))
    expect(view.getLocation().pathname).toBe('/subscription')
  })

  it('плашка истёкшего триала: онлайн-запись недоступна → экран подписки', async () => {
    api.getSubscription.mockResolvedValue(createSubscriptionState({
      status: 'TRIALING',
      trialEndsAt: new Date(Date.now() - 86_400_000).toISOString(),
    }))
    setMaster(createMasterProfile())
    const view = renderAtRoute(<HomePage />)

    await view.user.click(await screen.findByRole('button', { name: /Пробный период закончился/ }))
    expect(view.getLocation().pathname).toBe('/subscription')
  })

  it('не показывает плашку при свежем триале и при ACTIVE', async () => {
    api.getSubscription.mockResolvedValue(createSubscriptionState({
      status: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 6 * 86_400_000).toISOString(),
    }))
    setMaster(createMasterProfile())
    renderAtRoute(<HomePage />)

    // Строка статуса под именем есть, а красной плашки нет.
    expect(await screen.findByText(/Пробный период\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Пробный период заканчивается|Пробный период закончился/ })).not.toBeInTheDocument()
  })

})
