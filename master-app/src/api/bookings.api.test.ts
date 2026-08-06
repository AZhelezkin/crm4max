import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { BOOKING_ID, CLIENT_ID, MASTER_ID, SERVICE_ID } from '@/test/fixtures/auth'
import { createMasterBooking, createMasterBookingPackage } from '@/test/fixtures/bookings'
import { server } from '@/test/msw/server'

import { bookingsApi } from './bookings.api'

describe('master bookings API', () => {
  it('передаёт filters в list query', async () => {
    const booking = createMasterBooking()
    let query = ''
    server.use(
      http.get('*/api/bookings', ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json([booking])
      }),
    )

    const result = await bookingsApi.list({ status: 'CONFIRMED', from: '2026-07-01', to: '2026-07-31' })

    expect(query).toBe('?status=CONFIRMED&from=2026-07-01&to=2026-07-31')
    expect(result).toEqual([booking])
  })

  it('получает booking по id', async () => {
    const booking = createMasterBooking()
    server.use(http.get(`*/api/bookings/${BOOKING_ID}`, () => HttpResponse.json(booking)))

    await expect(bookingsApi.getById(BOOKING_ID)).resolves.toEqual(booking)
  })

  it('создаёт booking с полным master payload', async () => {
    const booking = createMasterBooking()
    const payload = {
      masterId: MASTER_ID,
      serviceId: SERVICE_ID,
      date: '2026-07-21',
      time: '10:00',
      clientId: CLIENT_ID,
      masterClientId: 'master-client-1',
      remind: true,
      clientAddress: null,
      price: 250_000,
      color: '#58A6FF',
      services: [{ serviceId: SERVICE_ID, price: 250_000 }],
      durationMinutes: 60,
      allowOverlap: true,
    }
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
    const bookingPackage = createMasterBookingPackage()
    const payload = {
      masterId: MASTER_ID,
      serviceId: SERVICE_ID,
      slots: [
        { date: '2026-07-21', time: '10:00' },
        { date: '2026-07-28', time: '11:00' },
      ],
      masterClientId: 'master-client-1',
      remind: false,
      clientAddress: 'Адрес клиента',
    }
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

  it('отправляет напоминание об оплате по exact endpoint', async () => {
    let requested = false
    server.use(
      http.post(`*/api/bookings/${BOOKING_ID}/remind-payment`, () => {
        requested = true
        return HttpResponse.json({ sent: true })
      }),
    )

    await expect(bookingsApi.remindPayment(BOOKING_ID)).resolves.toEqual({ sent: true })
    expect(requested).toBe(true)
  })

  it.each([
    ['confirmPayment', `/api/bookings/${BOOKING_ID}/confirm-payment`, undefined],
    ['reschedule', `/api/bookings/${BOOKING_ID}/reschedule`, { date: '2026-07-22', time: '12:00' }],
    ['cancel', `/api/bookings/${BOOKING_ID}/cancel`, undefined],
  ] as const)('выполняет %s по exact endpoint', async (method, path, payload) => {
    const booking = createMasterBooking()
    let body: object | null = null
    server.use(
      http.post(`*${path}`, async ({ request }) => {
        body = request.headers.get('content-length') === '0'
          ? null
          : await request.json().catch(() => null) as object | null
        return HttpResponse.json(booking)
      }),
    )

    const result = method === 'confirmPayment'
      ? await bookingsApi.confirmPayment(BOOKING_ID)
      : method === 'reschedule'
        ? await bookingsApi.reschedule(BOOKING_ID, payload)
        : await bookingsApi.cancel(BOOKING_ID)

    expect(body).toEqual(payload ?? null)
    expect(result).toEqual(booking)
  })
})
