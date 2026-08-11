import { Route, Routes } from 'react-router-dom'
import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterBooking } from '@/test/fixtures/bookings'
import { renderAtRoute } from '@/test/render'
import type { Booking } from '@/types'
import { BookingSeriesGatewayProvider, type BookingSeriesGateway } from '@/features/booking-series/gateway'

const api = vi.hoisted(() => ({
  getById: vi.fn(),
  confirmPayment: vi.fn(),
  cancel: vi.fn(),
  remind: vi.fn(),
  remindPayment: vi.fn(),
  openAddToCalendar: vi.fn(),
  previewSeries: vi.fn(),
  createSeries: vi.fn(),
  getSeries: vi.fn(),
  previewSeriesChange: vi.fn(),
  updateSeries: vi.fn(),
  cancelSeries: vi.fn(),
}))

vi.mock('@/api/bookings.api', () => ({
  bookingsApi: {
    getById: api.getById,
    confirmPayment: api.confirmPayment,
    cancel: api.cancel,
    remind: api.remind,
    remindPayment: api.remindPayment,
  },
}))
vi.mock('@/lib/calendar', () => ({ openAddToCalendar: api.openAddToCalendar }))

import BookingDetailPage from './BookingDetailPage'

const seriesGateway = {
  preview: api.previewSeries,
  create: api.createSeries,
  get: api.getSeries,
  previewChange: api.previewSeriesChange,
  update: api.updateSeries,
  cancel: api.cancelSeries,
} as unknown as BookingSeriesGateway

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

function renderPage(
  id = 'booking-mutation',
  bookingSeriesEnabled = false,
  state: { seriesIntent?: 'date' | 'time' | 'cancel' } | null = null,
) {
  const page = bookingSeriesEnabled ? (
    <BookingSeriesGatewayProvider enabled gateway={seriesGateway}>
      <BookingDetailPage />
    </BookingSeriesGatewayProvider>
  ) : <BookingDetailPage />
  return renderAtRoute(
    <Routes>
      <Route path="/bookings" element={<div>Список записей</div>} />
      <Route path="/bookings/new" element={<div>Флоу переноса</div>} />
      <Route path="/bookings/:id" element={page} />
      <Route path="/booking-series/:seriesId" element={<div>Карточка серии</div>} />
    </Routes>,
    { entries: [{ pathname: `/bookings/${id}`, state }] },
  )
}

describe('master BookingDetailPage mutations', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.getById.mockResolvedValue(createMasterBooking({ id: 'booking-mutation', date: '2099-08-11' }))
    api.confirmPayment.mockResolvedValue(createMasterBooking({
      id: 'booking-mutation',
      paymentStatus: 'PAID',
    }))
    api.cancel.mockResolvedValue(createMasterBooking({ id: 'booking-mutation', status: 'CANCELLED' }))
    api.remind.mockResolvedValue({ sent: true })
    api.remindPayment.mockResolvedValue({ sent: true })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('confirm-payment пишет один раз и заменяет UI authoritative response', async () => {
    const paid = createMasterBooking({
      id: 'booking-mutation',
      paymentStatus: 'PAID',
      notes: 'authoritative receipt',
    })
    const confirmation = deferred<Booking>()
    api.confirmPayment.mockReturnValue(confirmation.promise)
    const view = renderPage()
    const submit = await screen.findByRole('button', { name: 'Отметить как оплачено' })
    expect(api.confirmPayment).not.toHaveBeenCalled()

    await view.user.click(submit)

    expect(api.confirmPayment).toHaveBeenCalledWith('booking-mutation')
    expect(submit).toBeDisabled()
    await view.user.click(submit)
    expect(api.confirmPayment).toHaveBeenCalledOnce()

    await act(async () => confirmation.resolve(paid))
    expect(await screen.findByText('ОПЛАЧЕНО')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Отметить как оплачено' })).not.toBeInTheDocument()
  })

  it('cancel не пишет до dialog confirmation и использует exact booking id', async () => {
    const cancellation = deferred<Booking>()
    api.cancel.mockReturnValue(cancellation.promise)
    const view = renderPage()
    await screen.findByText('Ирина Клиентова')

    await view.user.click(screen.getByRole('button', { name: 'Действия' }))
    await view.user.click(screen.getByRole('menuitem', { name: 'Отменить' }))
    expect(api.cancel).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Отменить запись' }))
    expect(api.cancel).toHaveBeenCalledWith('booking-mutation')
    expect(api.cancel).toHaveBeenCalledOnce()

    await act(async () => cancellation.resolve(createMasterBooking({ id: 'booking-mutation', status: 'CANCELLED' })))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/bookings'))
  })

  it('cancel failure сохраняет detail и разрешает отдельный retry', async () => {
    api.cancel.mockRejectedValueOnce(new Error('cancel unavailable')).mockResolvedValueOnce(createMasterBooking({ id: 'booking-mutation', status: 'CANCELLED' }))
    const view = renderPage()
    await screen.findByText('Ирина Клиентова')

    await view.user.click(screen.getByRole('button', { name: 'Действия' }))
    await view.user.click(screen.getByRole('menuitem', { name: 'Отменить' }))
    await view.user.click(screen.getByRole('button', { name: 'Отменить запись' }))

    await waitFor(() => expect(api.cancel).toHaveBeenCalledTimes(1))
    expect(view.getLocation().pathname).toBe('/bookings/booking-mutation')
    expect(screen.getByText('Ирина Клиентова')).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Действия' }))
    await view.user.click(screen.getByRole('menuitem', { name: 'Отменить' }))
    await view.user.click(screen.getByRole('button', { name: 'Отменить запись' }))

    await waitFor(() => expect(api.cancel).toHaveBeenCalledTimes(2))
    expect(view.getLocation().pathname).toBe('/bookings')
  })

  it('reschedule entry только формирует route state без mutation', async () => {
    const booking = createMasterBooking({ id: 'booking-reschedule-entry', date: '2099-08-11' })
    api.getById.mockResolvedValue(booking)
    const view = renderPage('booking-reschedule-entry')

    await view.user.click(await screen.findByRole('button', { name: 'Изменить дату' }))

    expect(view.getLocation().pathname).toBe('/bookings/new')
    expect(view.getLocation().state).toEqual({
      rescheduleId: 'booking-reschedule-entry',
      serviceId: booking.service.id,
    })
    expect(api.confirmPayment).not.toHaveBeenCalled()
    expect(api.cancel).not.toHaveBeenCalled()
  })

  it('открывает scope-dialog серии по действию с главной', async () => {
    const booking = createMasterBooking({
      id: 'booking-series-from-home',
      date: '2099-08-12',
      series: {
        id: 'series-from-home',
        status: 'ACTIVE',
        version: 1,
        isException: false,
        originalDate: '2099-08-12',
        originalTime: '10:00',
        summary: 'Каждую неделю',
      },
    })
    api.getById.mockResolvedValue(booking)
    const view = renderPage('booking-series-from-home', true, { seriesIntent: 'cancel' })

    expect(await screen.findByRole('radio', { name: /Эта и следующие/ })).toBeInTheDocument()
    await waitFor(() => expect(view.getLocation().state).toBeNull())
    expect(api.cancel).not.toHaveBeenCalled()
  })

  it('batch cancel использует authoritative preview version и передаёт результат на экран серии', async () => {
    const booking = createMasterBooking({
      id: 'booking-series-cancel',
      date: '2099-08-12',
      series: {
        id: 'series-cancel',
        status: 'ACTIVE',
        version: 4,
        isException: false,
        originalDate: '2099-08-12',
        originalTime: '10:00',
        summary: 'Каждую неделю',
      },
    })
    const preview = {
      seriesId: 'series-cancel',
      version: 5,
      result: { updated: 0, created: 0, superseded: 0, skipped: [], warnings: [], cancelled: 3 },
    }
    const result = {
      series: { id: 'series-cancel', status: 'ACTIVE', version: 6 },
      result: { cancelled: 3, skipped: [] },
    }
    api.getById.mockResolvedValue(booking)
    api.previewSeriesChange.mockResolvedValue(preview)
    api.cancelSeries.mockResolvedValue(result)
    const view = renderPage('booking-series-cancel', true)
    await screen.findByText('Ирина Клиентова')

    await view.user.click(screen.getByRole('button', { name: 'Действия' }))
    await view.user.click(screen.getByRole('menuitem', { name: 'Отменить' }))
    await view.user.click(screen.getByRole('radio', { name: /Эта и следующие/ }))

    await waitFor(() => expect(api.previewSeriesChange).toHaveBeenCalledWith('series-cancel', {
      operation: 'CANCEL',
      scope: 'THIS_AND_FUTURE',
      anchorBookingId: 'booking-series-cancel',
      expectedVersion: 4,
    }))
    expect(api.cancelSeries).not.toHaveBeenCalled()
    await view.user.click(await screen.findByRole('button', { name: 'Отменить записи' }))

    await waitFor(() => expect(api.cancelSeries).toHaveBeenCalledWith('booking-series-cancel', {
      scope: 'THIS_AND_FUTURE',
      expectedSeriesVersion: 5,
    }))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/booking-series/series-cancel'))
    expect(view.getLocation().state).toEqual({ batchCancelResult: result })
  })

  it('batch cancel version conflict перечитывает версию и требует новое подтверждение', async () => {
    const booking = createMasterBooking({
      id: 'booking-series-version',
      date: '2099-08-12',
      series: {
        id: 'series-version',
        status: 'ACTIVE',
        version: 2,
        isException: false,
        originalDate: '2099-08-12',
        originalTime: '10:00',
        summary: 'Каждую неделю',
      },
    })
    api.getById.mockResolvedValue(booking)
    api.previewSeriesChange
      .mockResolvedValueOnce({
        seriesId: 'series-version',
        version: 2,
        result: { updated: 0, created: 0, superseded: 0, skipped: [], warnings: [], cancelled: 2 },
      })
      .mockResolvedValueOnce({
        seriesId: 'series-version',
        version: 8,
        result: { updated: 0, created: 0, superseded: 0, skipped: [], warnings: [], cancelled: 1 },
      })
    api.cancelSeries.mockRejectedValue({ response: { data: { error: { code: 'SERIES_VERSION_CONFLICT' } } } })
    api.getSeries.mockResolvedValue({ series: { version: 8 }, bookings: [], nextCursor: null })
    const view = renderPage('booking-series-version', true)
    await screen.findByText('Ирина Клиентова')

    await view.user.click(screen.getByRole('button', { name: 'Действия' }))
    await view.user.click(screen.getByRole('menuitem', { name: 'Отменить' }))
    await view.user.click(screen.getByRole('radio', { name: /Вся серия/ }))
    await view.user.click(await screen.findByRole('button', { name: 'Отменить записи' }))
    await view.user.click(await screen.findByRole('button', { name: 'Обновить и повторить' }))

    await waitFor(() => expect(api.getSeries).toHaveBeenCalledWith('series-version'))
    await waitFor(() => expect(api.previewSeriesChange).toHaveBeenLastCalledWith('series-version', {
      operation: 'CANCEL',
      scope: 'ALL',
      expectedVersion: 8,
    }))
    expect(await screen.findByText(/Будет отменено записей: 1/)).toBeInTheDocument()
    expect(api.cancelSeries).toHaveBeenCalledTimes(1)
  })
})
