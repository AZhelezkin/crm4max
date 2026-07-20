import type { Payment } from '@/types'

import { BOOKING_ID, CLIENT_ID, PAYMENT_ID, SERVICE_ID } from './auth'

export function createPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: PAYMENT_ID,
    bookingId: BOOKING_ID,
    amount: 250_000,
    method: 'CARD',
    status: 'PAID',
    createdAt: '2026-07-21T07:00:00.000Z',
    booking: {
      id: BOOKING_ID,
      date: '2026-07-21',
      time: '10:00',
      paymentStatus: 'PAID',
      client: {
        id: CLIENT_ID,
        name: 'Ирина Клиентова',
        photo: null,
      },
      service: {
        id: SERVICE_ID,
        name: 'Стрижка',
        price: 250_000,
      },
    },
    ...overrides,
  }
}
