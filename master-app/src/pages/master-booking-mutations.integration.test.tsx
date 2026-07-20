import { Route, Routes } from 'react-router-dom'
import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterBooking } from '@/test/fixtures/bookings'
import { renderAtRoute } from '@/test/render'
import type { Booking } from '@/types'

const api = vi.hoisted(() => ({
  getById: vi.fn(),
  confirmPayment: vi.fn(),
  cancel: vi.fn(),
  openAddToCalendar: vi.fn(),
}))

vi.mock('@/api/bookings.api', () => ({
  bookingsApi: {
    getById: api.getById,
    confirmPayment: api.confirmPayment,
    cancel: api.cancel,
  },
}))
vi.mock('@/lib/calendar', () => ({ openAddToCalendar: api.openAddToCalendar }))

import BookingDetailPage from './BookingDetailPage'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

function renderPage(id = 'booking-mutation') {
  return renderAtRoute(
    <Routes>
      <Route path="/bookings" element={<div>Список записей</div>} />
      <Route path="/bookings/new" element={<div>Флоу переноса</div>} />
      <Route path="/bookings/:id" element={<BookingDetailPage />} />
    </Routes>,
    { route: `/bookings/${id}` },
  )
}

describe('master BookingDetailPage mutations', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.getById.mockResolvedValue(createMasterBooking({ id: 'booking-mutation' }))
    api.confirmPayment.mockResolvedValue(createMasterBooking({
      id: 'booking-mutation',
      paymentStatus: 'PAID',
    }))
    api.cancel.mockResolvedValue(undefined)
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
    const cancellation = deferred<void>()
    api.cancel.mockReturnValue(cancellation.promise)
    const view = renderPage()
    await screen.findByText('Ирина Клиентова')

    await view.user.click(screen.getByRole('button', { name: /Отменить/ }))
    expect(api.cancel).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Отменить запись' }))
    expect(api.cancel).toHaveBeenCalledWith('booking-mutation')
    expect(api.cancel).toHaveBeenCalledOnce()

    await act(async () => cancellation.resolve())
    await waitFor(() => expect(view.getLocation().pathname).toBe('/bookings'))
  })

  it('cancel failure сохраняет detail и разрешает отдельный retry', async () => {
    api.cancel.mockRejectedValueOnce(new Error('cancel unavailable')).mockResolvedValueOnce(undefined)
    const view = renderPage()
    await screen.findByText('Ирина Клиентова')

    await view.user.click(screen.getByRole('button', { name: /Отменить/ }))
    await view.user.click(screen.getByRole('button', { name: 'Отменить запись' }))

    await waitFor(() => expect(api.cancel).toHaveBeenCalledTimes(1))
    expect(view.getLocation().pathname).toBe('/bookings/booking-mutation')
    expect(screen.getByText('Ирина Клиентова')).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: /Отменить/ }))
    await view.user.click(screen.getByRole('button', { name: 'Отменить запись' }))

    await waitFor(() => expect(api.cancel).toHaveBeenCalledTimes(2))
    expect(view.getLocation().pathname).toBe('/bookings')
  })

  it('reschedule entry только формирует route state без mutation', async () => {
    const booking = createMasterBooking({ id: 'booking-reschedule-entry' })
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
})
