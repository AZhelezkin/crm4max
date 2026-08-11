import type { Booking } from '@/types'
import type {
  BookingSeriesBookingReadModel,
  BookingSeriesBatchCancelResponse,
  BookingSeriesCreateRequest,
  BookingSeriesCreateResponse,
  BookingSeriesGetResponse,
  BookingSeriesManualActionBooking,
  BookingSeriesPreviewChangeResponse,
  BookingSeriesPreviewRequest,
  BookingSeriesPreviewResponse,
  BookingSeriesStatus,
  BookingSeriesUpdateResponse,
  RecurrenceRule,
} from '@/features/booking-series/types'
import { createMasterBooking } from '@/test/fixtures/bookings'
import { CLIENT_ID, MASTER_ID, SERVICE_ID } from '@/test/fixtures/auth'
import { createMasterService } from '@/test/fixtures/services'

export const bookingSeriesFixtureIds = {
  series: {
    active: 'series-active',
    exceptions: 'series-exceptions',
    manualPayment: 'series-manual-payment',
    ended: 'series-ended',
    cancelled: 'series-cancelled',
    created: 'series-created',
  },
  bookings: {
    activeFirst: 'booking-active-1',
    activeSecond: 'booking-active-2',
    activeThird: 'booking-active-3',
    exception: 'booking-exception',
    exceptionNext: 'booking-exception-next',
    manualPayment: 'booking-manual-payment',
    manualPaymentNext: 'booking-manual-payment-next',
    ended: 'booking-ended',
    cancelled: 'booking-cancelled',
    createdFirst: 'booking-created-1',
    createdSecond: 'booking-created-2',
  },
} as const

const service = createMasterService()

function createOccurrence({
  id,
  seriesId,
  seriesStatus,
  version,
  date,
  time,
  status = 'CONFIRMED',
  paymentStatus = 'UNPAID',
  isException = false,
  originalDate = date,
  originalTime = time,
}: {
  id: string
  seriesId: string
  seriesStatus: BookingSeriesStatus
  version: number
  date: string
  time: string
  status?: Booking['status']
  paymentStatus?: Booking['paymentStatus']
  isException?: boolean
  originalDate?: string
  originalTime?: string
}): BookingSeriesBookingReadModel {
  return {
    ...createMasterBooking({ id, date, time, status, paymentStatus }),
    series: {
      id: seriesId,
      status: seriesStatus,
      version,
      isException,
      originalDate,
      originalTime,
      summary: 'Каждую неделю · Пн 14:00, Ср 16:30',
    },
  }
}

function createSeriesFixture({
  id,
  status,
  version,
  bookings,
  exceptionsCount = 0,
  manualActionBookings = [],
  nextBookingId,
  startDate = '2026-08-17',
  endDate = null,
}: {
  id: string
  status: BookingSeriesStatus
  version: number
  bookings: BookingSeriesBookingReadModel[]
  exceptionsCount?: number
  manualActionBookings?: BookingSeriesManualActionBooking[]
  nextBookingId?: string | null
  startDate?: string
  endDate?: string | null
}): BookingSeriesGetResponse {
  const nextBooking = nextBookingId === null
    ? undefined
    : bookings.find((booking) => booking.id === (nextBookingId ?? bookings[0]?.id))

  return {
    series: {
      id,
      status,
      version,
      timezone: 'Europe/Moscow',
      startDate,
      endDate,
      rule: {
        intervalWeeks: 1,
        slots: [
          { dayOfWeek: 1, time: '14:00' },
          { dayOfWeek: 3, time: '16:30' },
        ],
      },
      template: {
        client: {
          id: CLIENT_ID,
          name: 'Ирина Клиентова',
          phone: '+79990000002',
          photo: null,
          isMaxUser: true,
        },
        services: [{
          service: {
            id: service.id,
            name: service.name,
            duration: service.duration,
            price: service.price,
            discountPercent: service.discountPercent,
            photo: service.photo,
          },
          price: null,
          order: 0,
        }],
        totalPrice: null,
        durationMinutes: service.duration,
        clientAddress: null,
        notes: 'Тестовая повторяющаяся запись',
        remind: true,
        color: null,
      },
      exceptionsCount,
      manualActionCount: manualActionBookings.length,
      manualActionBookings,
      nextOccurrence: nextBooking
        ? { bookingId: nextBooking.id, date: nextBooking.date, time: nextBooking.time }
        : null,
    },
    bookings,
    nextCursor: null,
  }
}

const activeBookings = [
  createOccurrence({
    id: bookingSeriesFixtureIds.bookings.activeFirst,
    seriesId: bookingSeriesFixtureIds.series.active,
    seriesStatus: 'ACTIVE',
    version: 3,
    date: '2026-08-17',
    time: '14:00',
  }),
  createOccurrence({
    id: bookingSeriesFixtureIds.bookings.activeSecond,
    seriesId: bookingSeriesFixtureIds.series.active,
    seriesStatus: 'ACTIVE',
    version: 3,
    date: '2026-08-19',
    time: '16:30',
    status: 'PENDING',
  }),
  createOccurrence({
    id: bookingSeriesFixtureIds.bookings.activeThird,
    seriesId: bookingSeriesFixtureIds.series.active,
    seriesStatus: 'ACTIVE',
    version: 3,
    date: '2026-08-24',
    time: '14:00',
  }),
]

export const activeSeriesFixture = createSeriesFixture({
  id: bookingSeriesFixtureIds.series.active,
  status: 'ACTIVE',
  version: 3,
  bookings: activeBookings,
})

const exceptionBookings = [
  createOccurrence({
    id: bookingSeriesFixtureIds.bookings.exception,
    seriesId: bookingSeriesFixtureIds.series.exceptions,
    seriesStatus: 'ACTIVE',
    version: 5,
    date: '2026-08-20',
    time: '18:00',
    isException: true,
    originalDate: '2026-08-19',
    originalTime: '16:30',
  }),
  createOccurrence({
    id: bookingSeriesFixtureIds.bookings.exceptionNext,
    seriesId: bookingSeriesFixtureIds.series.exceptions,
    seriesStatus: 'ACTIVE',
    version: 5,
    date: '2026-08-24',
    time: '14:00',
  }),
]

export const exceptionsSeriesFixture = createSeriesFixture({
  id: bookingSeriesFixtureIds.series.exceptions,
  status: 'ACTIVE',
  version: 5,
  bookings: exceptionBookings,
  exceptionsCount: 1,
  nextBookingId: bookingSeriesFixtureIds.bookings.exceptionNext,
})

const manualPaymentBookings = [
  createOccurrence({
    id: bookingSeriesFixtureIds.bookings.manualPaymentNext,
    seriesId: bookingSeriesFixtureIds.series.manualPayment,
    seriesStatus: 'ACTIVE',
    version: 4,
    date: '2026-08-31',
    time: '14:00',
  }),
  createOccurrence({
    id: bookingSeriesFixtureIds.bookings.manualPayment,
    seriesId: bookingSeriesFixtureIds.series.manualPayment,
    seriesStatus: 'ACTIVE',
    version: 4,
    date: '2026-09-07',
    time: '14:00',
    paymentStatus: 'DEPOSIT_PAID',
  }),
]

export const manualPaymentSeriesFixture = createSeriesFixture({
  id: bookingSeriesFixtureIds.series.manualPayment,
  status: 'ACTIVE',
  version: 4,
  bookings: manualPaymentBookings,
  manualActionBookings: [{
    bookingId: bookingSeriesFixtureIds.bookings.manualPayment,
    date: '2026-09-07',
    time: '14:00',
    paymentStatus: 'DEPOSIT_PAID',
    reason: 'PAYMENT_REQUIRES_MANUAL_ACTION',
  }],
})

export const endedSeriesFixture = createSeriesFixture({
  id: bookingSeriesFixtureIds.series.ended,
  status: 'ENDED',
  version: 8,
  bookings: [createOccurrence({
    id: bookingSeriesFixtureIds.bookings.ended,
    seriesId: bookingSeriesFixtureIds.series.ended,
    seriesStatus: 'ENDED',
    version: 8,
    date: '2026-08-03',
    time: '14:00',
    status: 'COMPLETED',
  })],
  nextBookingId: null,
  startDate: '2026-07-06',
  endDate: '2026-08-03',
})

export const cancelledSeriesFixture = createSeriesFixture({
  id: bookingSeriesFixtureIds.series.cancelled,
  status: 'CANCELLED',
  version: 6,
  bookings: [createOccurrence({
    id: bookingSeriesFixtureIds.bookings.cancelled,
    seriesId: bookingSeriesFixtureIds.series.cancelled,
    seriesStatus: 'CANCELLED',
    version: 6,
    date: '2026-08-10',
    time: '14:00',
    status: 'CANCELLED',
  })],
  nextBookingId: null,
  startDate: '2026-08-10',
})

export const finiteRecurrenceRuleFixture: RecurrenceRule = {
  startDate: '2026-08-17',
  endDate: '2026-09-14',
  intervalWeeks: 1,
  timezone: 'Europe/Moscow',
  slots: [
    { dayOfWeek: 1, time: '14:00' },
    { dayOfWeek: 3, time: '16:30' },
  ],
}

export const endlessRecurrenceRuleFixture: RecurrenceRule = {
  startDate: '2026-08-17',
  endDate: null,
  intervalWeeks: 2,
  timezone: 'Europe/Moscow',
  slots: [{ dayOfWeek: 1, time: '14:00' }],
}

export const previewRequestFixture: BookingSeriesPreviewRequest = {
  masterId: MASTER_ID,
  template: {
    clientId: CLIENT_ID,
    masterClientId: null,
    services: [{ serviceId: SERVICE_ID, price: null }],
    totalPrice: null,
    durationMinutes: 60,
    clientAddress: null,
    notes: 'Тестовая повторяющаяся запись',
    remind: true,
    color: null,
  },
  rule: finiteRecurrenceRuleFixture,
}

export const createRequestFixture: BookingSeriesCreateRequest = {
  ...previewRequestFixture,
  allowConflicts: false,
}

export const cleanPreviewFixture: BookingSeriesPreviewResponse = {
  occurrences: [
    { date: '2026-08-17', time: '14:00', warnings: [] },
    { date: '2026-08-19', time: '16:30', warnings: [] },
    { date: '2026-08-24', time: '14:00', warnings: [] },
    { date: '2026-08-26', time: '16:30', warnings: [] },
  ],
  previewLimit: 12,
  estimatedTotalOccurrences: 9,
  materializationOccurrences: 9,
  warningsCount: 0,
}

export const mixedPreviewFixture: BookingSeriesPreviewResponse = {
  occurrences: [
    {
      date: '2026-08-17',
      time: '14:00',
      warnings: [{ type: 'BOOKING_OVERLAP', message: 'Время пересекается с другой записью' }],
    },
    {
      date: '2026-08-19',
      time: '16:30',
      warnings: [{ type: 'BREAK_OVERLAP', message: 'Время попадает в перерыв' }],
    },
    {
      date: '2026-08-24',
      time: '14:00',
      warnings: [{ type: 'OUTSIDE_WORKING_HOURS', message: 'Время находится вне рабочего графика' }],
    },
    { date: '2026-08-26', time: '16:30', warnings: [] },
  ],
  previewLimit: 12,
  estimatedTotalOccurrences: null,
  materializationOccurrences: 26,
  warningsCount: 3,
}

const createdBookings = [
  createOccurrence({
    id: bookingSeriesFixtureIds.bookings.createdFirst,
    seriesId: bookingSeriesFixtureIds.series.created,
    seriesStatus: 'ACTIVE',
    version: 1,
    date: '2026-08-17',
    time: '14:00',
  }),
  createOccurrence({
    id: bookingSeriesFixtureIds.bookings.createdSecond,
    seriesId: bookingSeriesFixtureIds.series.created,
    seriesStatus: 'ACTIVE',
    version: 1,
    date: '2026-08-19',
    time: '16:30',
  }),
]

export const createdSeriesFixture = createSeriesFixture({
  id: bookingSeriesFixtureIds.series.created,
  status: 'ACTIVE',
  version: 1,
  bookings: createdBookings,
})

export const createResultFixture: BookingSeriesCreateResponse = {
  series: {
    id: bookingSeriesFixtureIds.series.created,
    status: 'ACTIVE',
    version: 1,
    timezone: 'Europe/Moscow',
    startDate: finiteRecurrenceRuleFixture.startDate,
    endDate: finiteRecurrenceRuleFixture.endDate,
    rule: {
      intervalWeeks: finiteRecurrenceRuleFixture.intervalWeeks,
      slots: finiteRecurrenceRuleFixture.slots,
    },
  },
  firstBookingId: bookingSeriesFixtureIds.bookings.createdFirst,
  materializedCount: 9,
  warnings: [],
}

export const batchPreviewFixture: BookingSeriesPreviewChangeResponse = {
  seriesId: bookingSeriesFixtureIds.series.exceptions,
  version: 5,
  result: {
    updated: 6,
    created: 2,
    superseded: 1,
    cancelled: 0,
    skipped: [{ bookingId: bookingSeriesFixtureIds.bookings.exception, reason: 'LOCAL_EXCEPTION' }],
    warnings: [],
  },
}

export const batchCancelPreviewFixture: BookingSeriesPreviewChangeResponse = {
  seriesId: bookingSeriesFixtureIds.series.manualPayment,
  version: 4,
  result: {
    updated: 0,
    created: 0,
    superseded: 0,
    cancelled: 3,
    skipped: [{
      bookingId: bookingSeriesFixtureIds.bookings.manualPayment,
      reason: 'PAYMENT_REQUIRES_MANUAL_ACTION',
    }],
    warnings: [],
  },
}

export const batchResultFixture: BookingSeriesUpdateResponse = {
  series: {
    id: bookingSeriesFixtureIds.series.exceptions,
    status: 'ACTIVE',
    version: 6,
  },
  result: {
    updated: 6,
    created: 2,
    superseded: 1,
    skipped: [{ bookingId: bookingSeriesFixtureIds.bookings.exception, reason: 'LOCAL_EXCEPTION' }],
    warnings: [],
  },
}

export const batchCancelResultFixture: BookingSeriesBatchCancelResponse = {
  series: {
    id: bookingSeriesFixtureIds.series.manualPayment,
    status: 'ENDED',
    version: 5,
  },
  result: {
    cancelled: 2,
    skipped: [{
      bookingId: bookingSeriesFixtureIds.bookings.manualPayment,
      reason: 'PAYMENT_REQUIRES_MANUAL_ACTION',
    }],
  },
}

export const bookingSeriesFixtures = {
  request: {
    preview: previewRequestFixture,
    create: createRequestFixture,
  },
  series: {
    active: activeSeriesFixture,
    exceptions: exceptionsSeriesFixture,
    manualPayment: manualPaymentSeriesFixture,
    ended: endedSeriesFixture,
    cancelled: cancelledSeriesFixture,
    created: createdSeriesFixture,
  },
  recurrence: {
    finite: finiteRecurrenceRuleFixture,
    endless: endlessRecurrenceRuleFixture,
  },
  preview: {
    clean: cleanPreviewFixture,
    mixed: mixedPreviewFixture,
    batch: batchPreviewFixture,
    batchCancel: batchCancelPreviewFixture,
  },
  result: {
    create: createResultFixture,
    batch: batchResultFixture,
    batchCancel: batchCancelResultFixture,
  },
} as const
