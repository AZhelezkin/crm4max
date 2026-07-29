import type {
  Booking as ClientBooking,
  BookingPackage as ClientBookingPackage,
} from '@client/types'
import type {
  Booking as MasterBooking,
  BookingPackage as MasterBookingPackage,
} from '@/types'

import { BOOKING_ID, CLIENT_ID, MASTER_ID, PACKAGE_ID } from './auth'
import { createClientService, createMasterService } from './services'

export function createMasterBooking(overrides: Partial<MasterBooking> = {}): MasterBooking {
  const service = createMasterService()
  return {
    id: BOOKING_ID,
    date: '2026-07-21',
    time: '10:00',
    status: 'CONFIRMED',
    paymentStatus: 'UNPAID',
    notes: null,
    price: null,
    clientAddress: null,
    remind: true,
    color: null,
    master: {
      id: MASTER_ID,
      name: 'Анна Мастерова',
      photo: null,
      location: 'Москва, Тестовая улица, 1',
      lat: 55.7558,
      lng: 37.6176,
    },
    client: {
      id: CLIENT_ID,
      name: 'Ирина Клиентова',
      phone: '+79990000002',
      photo: null,
    },
    service,
    services: [],
    payments: [],
    ...overrides,
    totalPrice: overrides.totalPrice ?? null,
  }
}

export function createClientBooking(overrides: Partial<ClientBooking> = {}): ClientBooking {
  const service = createClientService()
  return {
    id: BOOKING_ID,
    date: '2026-07-21',
    time: '10:00',
    status: 'CONFIRMED',
    paymentStatus: 'UNPAID',
    notes: null,
    price: null,
    remind: true,
    clientAddress: null,
    master: {
      id: MASTER_ID,
      name: 'Анна Мастерова',
      photo: null,
      location: 'Москва, Тестовая улица, 1',
      description: 'Тестовый профиль мастера',
      rating: 4.9,
      lat: 55.7558,
      lng: 37.6176,
      maxProfileLink: 'https://max.ru/anna_test',
      timezone: 'Europe/Moscow',
    },
    client: {
      id: CLIENT_ID,
      name: 'Ирина Клиентова',
      photo: null,
    },
    service,
    services: [],
    review: null,
    ...overrides,
  }
}

export function createMasterBookingPackage(
  overrides: Partial<MasterBookingPackage> = {},
): MasterBookingPackage {
  return {
    id: PACKAGE_ID,
    sessionsTotal: 2,
    totalAmount: 500_000,
    paymentStatus: 'UNPAID',
    master: {
      id: MASTER_ID,
      name: 'Анна Мастерова',
      photo: null,
      location: 'Москва, Тестовая улица, 1',
    },
    client: {
      id: CLIENT_ID,
      name: 'Ирина Клиентова',
      phone: '+79990000002',
      photo: null,
    },
    service: createMasterService({ sessionsCount: 2 }),
    bookings: [
      {
        id: BOOKING_ID,
        date: '2026-07-21',
        time: '10:00',
        status: 'CONFIRMED',
        paymentStatus: 'UNPAID',
        sessionIndex: 0,
        remind: true,
        clientAddress: null,
      },
    ],
    ...overrides,
  }
}

export function createClientBookingPackage(
  overrides: Partial<ClientBookingPackage> = {},
): ClientBookingPackage {
  const source = createMasterBookingPackage()
  return {
    id: source.id,
    sessionsTotal: source.sessionsTotal,
    totalAmount: source.totalAmount,
    paymentStatus: source.paymentStatus,
    master: source.master,
    client: source.client,
    service: createClientService({ sessionsCount: 2 }),
    bookings: source.bookings,
    ...overrides,
  }
}
