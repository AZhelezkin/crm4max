import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  BookingSeriesCancelRequest,
  BookingSeriesCreateRequest,
  BookingSeriesPreviewChangeRequest,
  BookingSeriesPreviewRequest,
  BookingSeriesPreviewResponse,
  BookingSeriesUpdateRequest,
} from './types'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/api/client', () => ({ api }))

import { restBookingSeriesGateway } from './restGateway'

const SERIES_ID = 'series-1'
const BOOKING_ID = 'booking-1'
const IDEMPOTENCY_KEY = '3f5f5065-cacf-4a99-8e33-84641a507eda'

const previewRequest = {
  masterId: 'master-1',
  template: {
    clientId: 'client-1',
    masterClientId: null,
    services: [{ serviceId: 'service-1', price: 250_000 }],
    totalPrice: 250_000,
    durationMinutes: 60,
    clientAddress: null,
    notes: 'Тестовая серия',
    remind: true,
    color: null,
  },
  rule: {
    startDate: '2026-08-17',
    endDate: null,
    intervalWeeks: 1,
    timezone: 'Europe/Moscow',
    slots: [{ dayOfWeek: 1, time: '14:00' }],
  },
} satisfies BookingSeriesPreviewRequest

const createRequest = {
  ...previewRequest,
  allowConflicts: false,
} satisfies BookingSeriesCreateRequest

const previewChangeRequest = {
  operation: 'CANCEL',
  scope: 'THIS_AND_FUTURE',
  anchorBookingId: BOOKING_ID,
  expectedVersion: 4,
} satisfies BookingSeriesPreviewChangeRequest

const updateRequest = {
  scope: 'ALL',
  expectedVersion: 4,
  allowConflicts: false,
  changes: {
    template: { notes: 'Обновлённая серия' },
  },
} satisfies BookingSeriesUpdateRequest

const batchCancelRequest = {
  scope: 'THIS_AND_FUTURE',
  expectedSeriesVersion: 4,
} satisfies BookingSeriesCancelRequest

const conflictPreview = {
  occurrences: [],
  previewLimit: 12,
  estimatedTotalOccurrences: null,
  materializationOccurrences: 26,
  warningsCount: 1,
} satisfies BookingSeriesPreviewResponse

interface SeriesConflictsResponseData {
  error: {
    code: 'SERIES_CONFLICTS'
    message: string
    details: {
      preview: BookingSeriesPreviewResponse
    }
  }
}

interface SeriesConflictsHttpError {
  response: {
    status: 409
    data: SeriesConflictsResponseData
  }
}

function expectOnlyHttpMethod(method: 'get' | 'patch' | 'post') {
  expect(api.get).toHaveBeenCalledTimes(method === 'get' ? 1 : 0)
  expect(api.patch).toHaveBeenCalledTimes(method === 'patch' ? 1 : 0)
  expect(api.post).toHaveBeenCalledTimes(method === 'post' ? 1 : 0)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('rest booking series gateway contract', () => {
  it('отправляет preview через exact POST path и body', async () => {
    const data = { source: 'preview response' }
    api.post.mockResolvedValueOnce({ data })

    const result = await restBookingSeriesGateway.preview(previewRequest)

    expectOnlyHttpMethod('post')
    expect(api.post.mock.calls).toEqual([['/booking-series/preview', previewRequest]])
    expect(result).toBe(data)
  })

  it('создаёт серию через exact POST path, body и Idempotency-Key', async () => {
    const data = { source: 'create response' }
    api.post.mockResolvedValueOnce({ data })

    const result = await restBookingSeriesGateway.create(createRequest, IDEMPOTENCY_KEY)

    expectOnlyHttpMethod('post')
    expect(api.post.mock.calls).toEqual([[
      '/booking-series',
      createRequest,
      { headers: { 'Idempotency-Key': IDEMPOTENCY_KEY } },
    ]])
    expect(result).toBe(data)
  })

  it('получает серию через exact GET path и query', async () => {
    const data = { source: 'get response' }
    const query = { cursor: BOOKING_ID, limit: 30 }
    api.get.mockResolvedValueOnce({ data })

    const result = await restBookingSeriesGateway.get(SERIES_ID, query)

    expectOnlyHttpMethod('get')
    expect(api.get.mock.calls).toEqual([[
      `/booking-series/${SERIES_ID}`,
      { params: query },
    ]])
    expect(result).toBe(data)
  })

  it('отправляет preview изменения через exact POST path и body', async () => {
    const data = { source: 'preview change response' }
    api.post.mockResolvedValueOnce({ data })

    const result = await restBookingSeriesGateway.previewChange(SERIES_ID, previewChangeRequest)

    expectOnlyHttpMethod('post')
    expect(api.post.mock.calls).toEqual([[
      `/booking-series/${SERIES_ID}/preview-change`,
      previewChangeRequest,
    ]])
    expect(result).toBe(data)
  })

  it('обновляет серию через exact PATCH path и body', async () => {
    const data = { source: 'update response' }
    api.patch.mockResolvedValueOnce({ data })

    const result = await restBookingSeriesGateway.update(SERIES_ID, updateRequest)

    expectOnlyHttpMethod('patch')
    expect(api.patch.mock.calls).toEqual([[
      `/booking-series/${SERIES_ID}`,
      updateRequest,
    ]])
    expect(result).toBe(data)
  })

  it('не передаёт body в legacy cancel при request undefined', async () => {
    const data = { source: 'legacy cancel response' }
    api.post.mockResolvedValueOnce({ data })

    const result = await restBookingSeriesGateway.cancel(BOOKING_ID)

    expectOnlyHttpMethod('post')
    expect(api.post.mock.calls).toEqual([[
      `/bookings/${BOOKING_ID}/cancel`,
      undefined,
    ]])
    expect(result).toBe(data)
  })

  it('передаёт batch cancel scope только в body POST записи-anchor', async () => {
    const data = { source: 'batch cancel response' }
    api.post.mockResolvedValueOnce({ data })

    const result = await restBookingSeriesGateway.cancel(BOOKING_ID, batchCancelRequest)

    expectOnlyHttpMethod('post')
    expect(api.post.mock.calls).toEqual([[
      `/bookings/${BOOKING_ID}/cancel`,
      batchCancelRequest,
    ]])
    expect(result).toBe(data)
  })

  it('пробрасывает SERIES_CONFLICTS с preview только в error.details.preview', async () => {
    const responseData = {
      error: {
        code: 'SERIES_CONFLICTS',
        message: 'В расписании есть предупреждения',
        details: { preview: conflictPreview },
      },
    } satisfies SeriesConflictsResponseData
    const conflictError = {
      response: {
        status: 409,
        data: responseData,
      },
    } satisfies SeriesConflictsHttpError
    api.post.mockRejectedValueOnce(conflictError)

    await expect(
      restBookingSeriesGateway.create(createRequest, IDEMPOTENCY_KEY),
    ).rejects.toBe(conflictError)

    expect(responseData).not.toHaveProperty('preview')
    expect(responseData.error).not.toHaveProperty('preview')
    expect(responseData.error.details).toEqual({ preview: conflictPreview })
  })
})
