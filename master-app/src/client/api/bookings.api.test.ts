import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { BOOKING_ID, MASTER_ID, PACKAGE_ID, SERVICE_ID } from '@/test/fixtures/auth'
import { createClientBooking, createClientBookingPackage } from '@/test/fixtures/bookings'
import { server } from '@/test/msw/server'

import { bookingsApi } from './bookings.api'

describe('client bookings API', () => {
  it('создаёт обычную запись с exact payload', async () => {
    const payload = {
      masterId: MASTER_ID,
      serviceId: SERVICE_ID,
      date: '2026-07-21',
      time: '10:00',
      remind: true,
      clientAddress: 'Адрес клиента',
    }
    const booking = createClientBooking()
    let body: object | null = null
    server.use(
      http.post('*/api/bookings', async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(booking)
      }),
    )

    const result = await bookingsApi.create(payload)

    expect(body).toEqual(payload)
    expect(result).toEqual(booking)
  })

  it('создаёт package с упорядоченными slots', async () => {
    const payload = {
      masterId: MASTER_ID,
      serviceId: SERVICE_ID,
      slots: [
        { date: '2026-07-21', time: '10:00' },
        { date: '2026-07-28', time: '11:00' },
      ],
      remind: false,
      clientAddress: null,
    }
    const bookingPackage = createClientBookingPackage()
    let body: object | null = null
    server.use(
      http.post('*/api/bookings/package', async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(bookingPackage)
      }),
    )

    const result = await bookingsApi.createPackage(payload)

    expect(body).toEqual(payload)
    expect(result).toEqual(bookingPackage)
  })

  it('передаёт filters в list query', async () => {
    const booking = createClientBooking()
    let search = ''
    server.use(
      http.get('*/api/bookings', ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json([booking])
      }),
    )

    const result = await bookingsApi.list({ status: 'CONFIRMED', from: '2026-07-01', to: '2026-07-31' })

    expect(search).toBe('?status=CONFIRMED&from=2026-07-01&to=2026-07-31')
    expect(result).toEqual([booking])
  })

  it('получает booking по id', async () => {
    const booking = createClientBooking()
    server.use(http.get(`*/api/bookings/${BOOKING_ID}`, () => HttpResponse.json(booking)))

    await expect(bookingsApi.getById(BOOKING_ID)).resolves.toEqual(booking)
  })

  it('получает package по id', async () => {
    const bookingPackage = createClientBookingPackage()
    server.use(
      http.get(`*/api/bookings/package/${PACKAGE_ID}`, () => HttpResponse.json(bookingPackage)),
    )

    await expect(bookingsApi.getPackageById(PACKAGE_ID)).resolves.toEqual(bookingPackage)
  })

  it('переносит booking с exact payload', async () => {
    const payload = { date: '2026-07-22', time: '12:00' }
    const booking = createClientBooking(payload)
    let body: object | null = null
    server.use(
      http.post(`*/api/bookings/${BOOKING_ID}/reschedule`, async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(booking)
      }),
    )

    const result = await bookingsApi.reschedule(BOOKING_ID, payload)

    expect(body).toEqual(payload)
    expect(result).toEqual(booking)
  })

  it('обновляет настройку напоминания', async () => {
    const booking = createClientBooking({ reminder: 'TWO_HOURS' })
    let body: object | null = null
    server.use(
      http.post(`*/api/bookings/${BOOKING_ID}/reminder`, async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(booking)
      }),
    )

    const result = await bookingsApi.updateReminder(BOOKING_ID, 'TWO_HOURS')

    expect(body).toEqual({ reminder: 'TWO_HOURS' })
    expect(result).toEqual(booking)
  })

  it('отменяет обычную запись по id', async () => {
    const booking = createClientBooking({ status: 'CANCELLED' })
    server.use(
      http.post(`*/api/bookings/${BOOKING_ID}/cancel`, () => HttpResponse.json(booking)),
    )

    await expect(bookingsApi.cancel(BOOKING_ID)).resolves.toEqual(booking)
  })

  it('отменяет package одним endpoint', async () => {
    const bookingPackage = createClientBookingPackage()
    server.use(
      http.post(`*/api/bookings/package/${PACKAGE_ID}/cancel`, () => HttpResponse.json(bookingPackage)),
    )

    await expect(bookingsApi.cancelPackage(PACKAGE_ID)).resolves.toEqual(bookingPackage)
  })
})
