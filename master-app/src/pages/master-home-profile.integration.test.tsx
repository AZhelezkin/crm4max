import dayjs from 'dayjs'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
import ProfilePage from './ProfilePage'

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

describe('master HomePage and ProfilePage', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    vi.spyOn(window, 'open').mockImplementation(() => null)
    primeSuccessfulReads()
    setMaster(null)
  })

  it('показывает skeleton пока master не загружен', () => {
    const pending = new Promise(() => {})
    api.listBookings.mockReturnValue(pending)
    api.listClients.mockReturnValue(pending)
    api.getSubscription.mockReturnValue(pending)
    api.getMaster.mockReturnValue(pending)
    const home = renderAtRoute(<HomePage />)
    expect(home.container.querySelectorAll('.skeleton')).toHaveLength(9)
    home.unmount()

    const profile = renderAtRoute(<ProfilePage />)
    expect(profile.container.querySelectorAll('.skeleton')).toHaveLength(9)
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
    expect(screen.queryByText('Отменённый клиент')).not.toBeInTheDocument()
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

    expect(await screen.findByText('Нет записей на сегодня')).toBeInTheDocument()
    expect(screen.getByText('ходят 0, не ходят 0')).toBeInTheDocument()
    expect(screen.getByText('Не указан')).toBeInTheDocument()
  })

  it('HomePage prefetch pay URL и сохраняет payment return context для GRACE', async () => {
    const webApp = installWebApp()
    const graceEndsAt = new Date(Date.now() + 3 * 86_400_000).toISOString()
    api.getSubscription.mockResolvedValue(createSubscriptionState({
      status: 'GRACE',
      graceEndsAt,
      lastChargeError: 'insufficient_funds',
      hasAccess: true,
    }))
    api.paySubscription.mockResolvedValue({ paymentURL: 'https://pay.test/retry' })
    setMaster(createMasterProfile())
    const view = renderAtRoute(<HomePage />)
    const pay = await screen.findByRole('button', { name: /Не удалось оплатить подписку/ })
    await waitFor(() => expect(api.paySubscription).toHaveBeenCalledOnce())

    await view.user.click(pay)

    expect(webApp.openLink).toHaveBeenCalledWith('https://pay.test/retry')
    expect(localStorage.getItem('sub:payPending')).toBe('1')
    expect(localStorage.getItem('sub:preErr')).toBe('insufficient_funds')
  })

  it('ProfilePage показывает профиль, расписание, услуги, фото и отзывы', async () => {
    const service = createMasterService({
      name: 'Окрашивание',
      workPhotos: [{ id: 'photo-1', url: 'https://cdn.test/work.jpg', order: 0 }],
    })
    const master = createMasterProfile({ homeVisit: true, services: [service], rating: 4.8 })
    const booking = createMasterBooking({ id: 'profile-booking', date: TODAY, service })
    api.getMaster.mockResolvedValue(master)
    api.listBookings.mockResolvedValue([booking])
    api.getSubscription.mockResolvedValue(createSubscriptionState({
      status: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    }))
    api.getReviews.mockResolvedValue([{
      id: 'review-1',
      rating: 5,
      text: 'Отличная работа',
      createdAt: '2026-07-18T10:00:00.000Z',
      client: { name: 'Ирина', photo: null },
    }])
    setMaster(master)
    const view = renderAtRoute(<ProfilePage />)

    expect((await screen.findAllByText('Окрашивание')).length).toBeGreaterThan(0)
    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText('Доступен выезд на дом')).toBeInTheDocument()
    expect(screen.getByText('Пробный период')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: /Фото/ }))
    expect(document.body.querySelector('img[src="https://cdn.test/work.jpg"]')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: /Отзывы/ }))
    expect(await screen.findByText('Отличная работа')).toBeInTheDocument()
  })

  it('ProfilePage показывает empty state после read failures', async () => {
    const profile = createMasterProfile({ services: [] })
    const master = { ...profile, schedule: { ...profile.schedule!, workingDays: [1, 2, 3, 4, 5, 6, 7] } }
    api.getMaster.mockRejectedValue(new Error('refresh unavailable'))
    api.listBookings.mockRejectedValue(new Error('bookings unavailable'))
    api.getSubscription.mockRejectedValue(new Error('subscription unavailable'))
    api.getReviews.mockRejectedValue(new Error('reviews unavailable'))
    setMaster(master)
    const view = renderAtRoute(<ProfilePage />)

    expect(await screen.findByText('Услуги ещё не добавлены')).toBeInTheDocument()
    expect(screen.getByText('Нет записей на сегодня')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: /Отзывы/ }))
    expect(await screen.findByText('Пока нет отзывов')).toBeInTheDocument()
  })

  it('ProfilePage сохраняет exact date route state и toolbar routes', async () => {
    const master = createMasterProfile()
    api.getMaster.mockResolvedValue(master)
    setMaster(master)
    const createView = renderAtRoute(<ProfilePage />)

    await createView.user.click(screen.getByRole('button', { name: 'Создать запись на сегодня' }))
    expect(createView.getLocation().pathname).toBe('/bookings/new')
    expect(createView.getLocation().state).toEqual({ date: TODAY })
    createView.unmount()

    setMaster(master)
    const settingsView = renderAtRoute(<ProfilePage />)
    await settingsView.user.click(screen.getByRole('button', { name: 'Настройки профиля' }))
    expect(settingsView.getLocation().pathname).toBe('/settings')
  })
})
