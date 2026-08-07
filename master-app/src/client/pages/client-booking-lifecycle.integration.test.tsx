import dayjs from 'dayjs'
import { Route, Routes } from 'react-router-dom'
import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BOOKING_ID, MASTER_ID } from '@/test/fixtures/auth'
import { createClientBooking } from '@/test/fixtures/bookings'
import { createClientService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'
import type { Booking } from '@client/types'
import { installWebApp } from '@/test/web-app-fixture'

const OTHER_MASTER_ID = '20000000-0000-4000-8000-000000000002'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  cancel: vi.fn(),
}))

vi.mock('@/App', () => ({ startParam: '' }))
vi.mock('@client/api/bookings.api', () => ({
  bookingsApi: {
    list: api.list,
    getById: api.getById,
    cancel: api.cancel,
  },
}))

import BookingDetailPage from './BookingDetailPage'
import MyBookingsPage from './MyBookingsPage'
import { useBookingStore } from '../store/booking.store'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

function resetBookingStore() {
  useBookingStore.setState({
    masterId: MASTER_ID,
    masterProfileLink: null,
    rescheduleId: null,
    service: null,
    categoryName: null,
    date: '',
    time: '',
    slots: [],
    remind: true,
    clientAddress: null,
    onlineMeetingLink: null,
  })
}

function futureBooking(overrides: Partial<Booking> = {}) {
  return createClientBooking({
    id: BOOKING_ID,
    date: dayjs().add(10, 'day').format('YYYY-MM-DD'),
    time: '14:00',
    ...overrides,
  })
}

function renderDetail(booking = futureBooking()) {
  api.getById.mockResolvedValue(booking)
  return renderAtRoute(
    <Routes>
      <Route path="/my-bookings" element={<div>Мои записи</div>} />
      <Route path="/my-bookings/:id" element={<BookingDetailPage />} />
      <Route path="/book/calendar" element={<div>Выбор даты</div>} />
    </Routes>,
    { route: `/my-bookings/${booking.id}` },
  )
}

describe('client booking lifecycle', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.cancel.mockResolvedValue(futureBooking({ status: 'CANCELLED' }))
    resetBookingStore()
  })

  it('список фильтрует cancelled/другого мастера и показывает future, past и package service', async () => {
    const future = futureBooking({ id: 'booking-future', service: createClientService({ name: 'Будущая услуга' }) })
    const past = futureBooking({
      id: 'booking-past',
      date: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
      status: 'COMPLETED',
      service: createClientService({ name: 'Прошлая услуга' }),
    })
    const packageSession = futureBooking({
      id: 'booking-package-session',
      date: dayjs().add(12, 'day').format('YYYY-MM-DD'),
      service: createClientService({ name: 'Курс массажа', sessionsCount: 3 }),
    })
    const cancelled = futureBooking({ id: 'booking-cancelled', status: 'CANCELLED', service: createClientService({ name: 'Скрытая отмена' }) })
    const anotherMaster = futureBooking({
      id: 'booking-other-master',
      service: createClientService({ name: 'Чужой мастер' }),
      master: { ...future.master, id: OTHER_MASTER_ID },
    })
    api.list.mockResolvedValue([future, past, packageSession, cancelled, anotherMaster])
    renderAtRoute(<MyBookingsPage />, { route: '/my-bookings' })

    expect(await screen.findByText('Будущая услуга')).toBeInTheDocument()
    expect(screen.getByText('Прошлая услуга')).toBeInTheDocument()
    expect(screen.getByText('Курс массажа')).toBeInTheDocument()
    expect(screen.queryByText('Скрытая отмена')).not.toBeInTheDocument()
    expect(screen.queryByText('Чужой мастер')).not.toBeInTheDocument()
  })

  it('search фильтрует service/date и выбранная строка сохраняет booking route identity', async () => {
    const target = futureBooking({
      id: 'booking-search-target',
      service: createClientService({ name: 'Авторская укладка' }),
    })
    const other = futureBooking({
      id: 'booking-search-other',
      date: dayjs().add(11, 'day').format('YYYY-MM-DD'),
      service: createClientService({ name: 'Маникюр' }),
    })
    api.list.mockResolvedValue([target, other])
    const view = renderAtRoute(<MyBookingsPage />, { route: '/my-bookings' })
    await screen.findByText('Авторская укладка')

    await view.user.click(screen.getByRole('button', { name: 'Поиск' }))
    await view.user.type(screen.getByPlaceholderText('Найти запись'), 'уклад')
    const targetButton = screen.getByRole('button', { name: /Авторская.*уклад.*ка/ })
    expect(targetButton).toBeInTheDocument()
    expect(screen.queryByText('Маникюр')).not.toBeInTheDocument()
    await view.user.click(targetButton)

    expect(view.getLocation().pathname).toBe('/my-bookings/booking-search-target')
  })

  it('list failure завершает loading текущим empty state', async () => {
    api.list.mockRejectedValue(new Error('list unavailable'))
    renderAtRoute(<MyBookingsPage />, { route: '/my-bookings' })

    expect(await screen.findByText('Нет записей')).toBeInTheDocument()
  })

  it('ordinary cancel не пишет до action, блокирует duplicate и после success возвращает в list', async () => {
    const cancellation = deferred<Booking>()
    api.cancel.mockReturnValue(cancellation.promise)
    const booking = futureBooking({ id: 'booking-cancel-action' })
    const view = renderDetail(booking)
    const cancel = await screen.findByRole('button', { name: 'Отменить' })

    expect(api.cancel).not.toHaveBeenCalled()
    await view.user.click(cancel)
    expect(api.cancel).toHaveBeenCalledWith('booking-cancel-action')
    expect(cancel).toBeDisabled()
    await view.user.click(cancel)
    expect(api.cancel).toHaveBeenCalledOnce()

    await act(async () => cancellation.resolve({ ...booking, status: 'CANCELLED' }))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/my-bookings'))
  })

  it('cancel failure остаётся в detail и допускает retry', async () => {
    const booking = futureBooking({ id: 'booking-cancel-retry' })
    api.cancel
      .mockRejectedValueOnce(new Error('cancel unavailable'))
      .mockResolvedValueOnce({ ...booking, status: 'CANCELLED' })
    const view = renderDetail(booking)

    await view.user.click(await screen.findByRole('button', { name: 'Отменить' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Отменить' })).toBeEnabled())
    expect(view.getLocation().pathname).toBe('/my-bookings/booking-cancel-retry')
    await view.user.click(screen.getByRole('button', { name: 'Отменить' }))

    await waitFor(() => expect(api.cancel).toHaveBeenCalledTimes(2))
    expect(view.getLocation().pathname).toBe('/my-bookings')
  })

  it('reschedule entry переносит exact identity в draft без mutation', async () => {
    const booking = futureBooking({
      id: 'booking-reschedule-entry',
      clientAddress: 'Москва, Дом 7',
      onlineMeetingLink: null,
      service: createClientService({ id: 'service-reschedule', name: 'Переносимая услуга' }),
    })
    const view = renderDetail(booking)

    await view.user.click(await screen.findByRole('button', { name: 'Перенести' }))

    expect(view.getLocation().pathname).toBe('/book/calendar')
    expect(useBookingStore.getState()).toMatchObject({
      masterId: booking.master.id,
      service: booking.service,
      date: booking.date,
      time: booking.time,
      clientAddress: 'Москва, Дом 7',
      onlineMeetingLink: null,
      rescheduleId: 'booking-reschedule-entry',
    })
    expect(api.cancel).not.toHaveBeenCalled()
  })

  it('показывает клиенту и открывает ссылку онлайн-встречи', async () => {
    const webApp = installWebApp()
    const link = 'https://meet.example.com/room'
    const view = renderDetail(futureBooking({ onlineMeetingLink: link }))

    await view.user.click(await screen.findByRole('button', { name: 'Открыть ссылку на онлайн-встречу' }))

    expect(screen.getByText(link)).toBeInTheDocument()
    expect(screen.getByText('Онлайн')).toBeInTheDocument()
    expect(webApp.openLink).toHaveBeenCalledWith(link)

    await view.user.click(screen.getByRole('button', { name: 'Перенести' }))
    expect(useBookingStore.getState()).toMatchObject({
      rescheduleId: BOOKING_ID,
      onlineMeetingLink: link,
    })
  })

  it('у клиента нет кнопки «Отметить как оплачено» — оплату подтверждает мастер', async () => {
    renderDetail(futureBooking({ paymentStatus: 'UNPAID' }))

    await screen.findByRole('button', { name: 'Перенести' })
    expect(screen.queryByRole('button', { name: 'Отметить как оплачено' })).not.toBeInTheDocument()
  })
})
