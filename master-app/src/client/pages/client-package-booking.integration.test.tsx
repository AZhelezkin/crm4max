import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BOOKING_ID, MASTER_ID, SERVICE_ID } from '@/test/fixtures/auth'
import { createClientBookingPackage } from '@/test/fixtures/bookings'
import { createClientMaster } from '@/test/fixtures/masters'
import { createClientService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'
import type { BookingPackage } from '@client/types'

const api = vi.hoisted(() => ({
  getMaster: vi.fn(),
  getSlots: vi.fn(),
  createPackage: vi.fn(),
}))

vi.mock('@client/api/masters.api', () => ({
  mastersApi: {
    getById: api.getMaster,
    getSlots: api.getSlots,
  },
}))
vi.mock('@client/api/bookings.api', () => ({
  bookingsApi: { createPackage: api.createPackage },
}))
vi.mock('@client/components/AddressSuggestField', () => ({
  default: ({ value, onChange, placeholder }: {
    value: string
    onChange: (value: string) => void
    placeholder: string
  }) => <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />,
}))

import PackageBookingPage from './PackageBookingPage'
import { useBookingStore } from '../store/booking.store'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

const orderedSlots = [
  { date: '2030-01-10', time: '10:00' },
  { date: '2030-01-17', time: '11:00' },
  { date: '2030-01-24', time: '12:00' },
]

function seedPackage(slots = orderedSlots) {
  useBookingStore.setState({
    masterId: MASTER_ID,
    masterProfileLink: 'https://max.ru/master',
    rescheduleId: null,
    service: createClientService({ id: SERVICE_ID, name: 'Курс укладок', sessionsCount: 3 }),
    categoryName: null,
    date: '',
    time: '',
    slots,
    remind: false,
    clientAddress: 'Москва, Дом 1',
    clientApartment: '15',
    clientFloor: '7',
    clientIntercom: '123#',
  })
}

describe('client package booking', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.getMaster.mockResolvedValue(createClientMaster({ homeVisit: true }))
    api.getSlots.mockResolvedValue([])
    seedPackage()
  })

  it('открывает calendar с exact session index и сохраняет остальные slots', async () => {
    seedPackage([orderedSlots[0]])
    const view = renderAtRoute(<PackageBookingPage />, { route: '/book/package' })
    const selectors = await screen.findAllByRole('button', { name: /Выбрать дату и время/ })

    await view.user.click(selectors[1])

    expect(view.getLocation()).toMatchObject({
      pathname: '/book/calendar',
      state: { sessionIndex: 2 },
    })
    expect(useBookingStore.getState().slots).toEqual([orderedSlots[0]])
  })

  it('не пишет incomplete package, затем отправляет ordered exact payload один раз', async () => {
    seedPackage(orderedSlots.slice(0, 2))
    const receipt = createClientBookingPackage({
      bookings: [{
        id: BOOKING_ID,
        date: orderedSlots[0].date,
        time: orderedSlots[0].time,
        status: 'CONFIRMED',
        paymentStatus: 'UNPAID',
        sessionIndex: 0,
        remind: false,
        clientAddress: 'Москва, Дом 1',
      }],
    })
    const request = deferred<BookingPackage>()
    api.createPackage.mockReturnValue(request.promise)
    const view = renderAtRoute(<PackageBookingPage />, { route: '/book/package' })
    await screen.findByText('Анна Мастерова')
    let submit = screen.getByRole('button', { name: 'Записаться' })

    expect(submit).toBeDisabled()
    expect(api.createPackage).not.toHaveBeenCalled()
    await act(async () => useBookingStore.getState().setSlots(orderedSlots))
    submit = screen.getByRole('button', { name: 'Записаться' })
    expect(submit).toBeEnabled()

    await view.user.click(submit)
    expect(api.createPackage).toHaveBeenCalledWith({
      masterId: MASTER_ID,
      serviceId: SERVICE_ID,
      slots: orderedSlots,
      remind: false,
      clientAddress: 'Москва, Дом 1, кв. 15, этаж 7, домофон 123#',
    })
    expect(submit).toBeDisabled()
    await view.user.click(submit)
    expect(api.createPackage).toHaveBeenCalledOnce()

    await act(async () => request.resolve(receipt))
    await waitFor(() => expect(view.getLocation()).toMatchObject({
      pathname: '/book/success',
      state: { bookingId: BOOKING_ID },
    }))
  })

  it('failure сохраняет ordered slots, показывает conflict и разрешает retry', async () => {
    const receipt = createClientBookingPackage()
    api.createPackage
      .mockRejectedValueOnce({
        response: { data: { slot: orderedSlots[1] } },
      })
      .mockResolvedValueOnce(receipt)
    const view = renderAtRoute(<PackageBookingPage />, { route: '/book/package' })
    await screen.findByText('Анна Мастерова')

    await view.user.click(screen.getByRole('button', { name: 'Записаться' }))

    expect(await screen.findByText(/уже занят — выберите другой/)).toBeInTheDocument()
    expect(useBookingStore.getState().slots).toEqual(orderedSlots)
    expect(view.getLocation().pathname).toBe('/book/package')
    await view.user.click(screen.getByRole('button', { name: 'Записаться' }))

    await waitFor(() => expect(api.createPackage).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/book/success'))
  })
})
