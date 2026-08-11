import { describe, expect, it } from 'vitest'

import type {
  BookingSeriesCancelRequest,
  BookingSeriesPreviewChangeRequest,
  BookingSeriesStatus,
  BookingSeriesUpdateRequest,
  SeriesBatchActionScope,
} from '@/features/booking-series/types'

import {
  activeSeriesFixture,
  batchCancelPreviewFixture,
  batchCancelResultFixture,
  batchPreviewFixture,
  batchResultFixture,
  bookingSeriesFixtureIds,
  cancelledSeriesFixture,
  cleanPreviewFixture,
  createRequestFixture,
  createResultFixture,
  endedSeriesFixture,
  endlessRecurrenceRuleFixture,
  exceptionsSeriesFixture,
  manualPaymentSeriesFixture,
  mixedPreviewFixture,
  previewRequestFixture,
} from './fixtures'
import {
  createMockBookingSeriesGateway,
  type MockBookingSeriesScenario,
} from './mockGateway'

function copy<T>(value: T): T {
  return structuredClone(value)
}

function updateRequest(
  expectedVersion = activeSeriesFixture.series.version,
  allowConflicts = false,
): BookingSeriesUpdateRequest {
  return {
    scope: 'ALL',
    expectedVersion,
    allowConflicts,
    changes: { rule: copy(endlessRecurrenceRuleFixture) },
  }
}

function previewUpdateRequest(expectedVersion = activeSeriesFixture.series.version): BookingSeriesPreviewChangeRequest {
  return {
    operation: 'UPDATE',
    ...updateRequest(expectedVersion),
  }
}

describe('booking series fixtures', () => {
  it('предоставляют базовые read, preview и batch состояния для harness', () => {
    expect([
      activeSeriesFixture.series.status,
      endedSeriesFixture.series.status,
      cancelledSeriesFixture.series.status,
    ]).toEqual(['ACTIVE', 'ENDED', 'CANCELLED'])
    expect(exceptionsSeriesFixture.series.exceptionsCount).toBe(1)
    expect(exceptionsSeriesFixture.bookings.some((booking) => booking.series.isException)).toBe(true)
    expect(manualPaymentSeriesFixture.series.manualActionBookings).toEqual([
      expect.objectContaining({
        bookingId: bookingSeriesFixtureIds.bookings.manualPayment,
        reason: 'PAYMENT_REQUIRES_MANUAL_ACTION',
      }),
    ])
    expect(cleanPreviewFixture.warningsCount).toBe(0)
    expect(new Set(mixedPreviewFixture.occurrences.flatMap((item) => item.warnings.map((warning) => warning.type))))
      .toEqual(new Set(['BOOKING_OVERLAP', 'BREAK_OVERLAP', 'OUTSIDE_WORKING_HOURS']))
    expect(batchPreviewFixture.result).toMatchObject({ updated: 6, created: 2 })
    expect(batchPreviewFixture.result.skipped).toHaveLength(1)
    expect(batchResultFixture.result).toMatchObject({ updated: 6, created: 2 })
  })
})

describe('createMockBookingSeriesGateway', () => {
  it('возвращает deep clones и защищает call log/state от внешних мутаций', async () => {
    const gateway = createMockBookingSeriesGateway({ series: [activeSeriesFixture] })
    const request = copy(previewRequestFixture)
    const first = await gateway.preview(request)

    first.occurrences[0].warnings.push({ type: 'BOOKING_OVERLAP', message: 'mutated response' })
    request.rule.slots[0].time = '00:00'
    const calls = gateway.calls
    const firstCall = calls[0]
    expect(firstCall.method).toBe('preview')
    if (firstCall.method === 'preview') firstCall.request.rule.slots[0].time = '01:00'
    const state = gateway.state
    state.series[0].series.version = 999

    expect(await gateway.preview(copy(previewRequestFixture))).toEqual(cleanPreviewFixture)
    const storedCall = gateway.calls[0]
    expect(storedCall.method).toBe('preview')
    if (storedCall.method === 'preview') expect(storedCall.request.rule.slots[0].time).toBe('14:00')
    expect(gateway.state.series[0].series.version).toBe(activeSeriesFixture.series.version)
    expect(gateway.state.lastResponses.preview).toEqual(cleanPreviewFixture)
  })

  it('пагинирует get по booking cursor и отвергает неизвестные series/cursor', async () => {
    const gateway = createMockBookingSeriesGateway({
      series: [activeSeriesFixture],
      defaultPageSize: 2,
    })

    const first = await gateway.get(bookingSeriesFixtureIds.series.active)
    expect(first.bookings.map((booking) => booking.id)).toEqual([
      bookingSeriesFixtureIds.bookings.activeFirst,
      bookingSeriesFixtureIds.bookings.activeSecond,
    ])
    expect(first.nextCursor).toBe(bookingSeriesFixtureIds.bookings.activeSecond)

    const second = await gateway.get(bookingSeriesFixtureIds.series.active, { cursor: first.nextCursor! })
    expect(second.bookings.map((booking) => booking.id)).toEqual([
      bookingSeriesFixtureIds.bookings.activeThird,
    ])
    expect(second.nextCursor).toBeNull()

    first.series.template.client.name = 'Mutated client'
    first.bookings[0].status = 'CANCELLED'
    const fresh = await gateway.get(bookingSeriesFixtureIds.series.active, { limit: 1 })
    expect(fresh.series.template.client.name).toBe('Ирина Клиентова')
    expect(fresh.bookings[0].status).toBe('CONFIRMED')

    await expect(gateway.get('series-unknown')).rejects.toMatchObject({
      response: { status: 404, data: { error: { code: 'SERIES_NOT_FOUND' } } },
    })
    await expect(gateway.get(bookingSeriesFixtureIds.series.active, { cursor: 'booking-unknown' }))
      .rejects.toMatchObject({
        response: { status: 404, data: { error: { code: 'BOOKING_NOT_FOUND' } } },
      })
  })

  it('создаёт серию идемпотентно по canonical payload без allowConflicts', async () => {
    const gateway = createMockBookingSeriesGateway({ series: [] })
    const key = 'idempotency-create-1'
    const first = await gateway.create(copy(createRequestFixture), key)
    first.series.version = 999

    const retryRequest = copy(createRequestFixture)
    retryRequest.allowConflicts = true
    const retry = await gateway.create(retryRequest, key)

    expect(retry).toEqual(createResultFixture)
    expect(retry).not.toBe(first)
    expect(gateway.state.idempotentCreates).toHaveLength(1)
    expect(gateway.state.series.map((series) => series.series.id)).toEqual([
      bookingSeriesFixtureIds.series.created,
    ])
    expect((await gateway.get(bookingSeriesFixtureIds.series.created)).bookings[0].id)
      .toBe(createResultFixture.firstBookingId)

    const reused = copy(createRequestFixture)
    reused.masterId = 'another-master'
    await expect(gateway.create(reused, key)).rejects.toMatchObject({
      response: { status: 409, data: { error: { code: 'IDEMPOTENCY_KEY_REUSED' } } },
    })
  })

  it('SERIES_CONFLICTS create возвращает authoritative preview и не резервирует key', async () => {
    const gateway = createMockBookingSeriesGateway({
      series: [],
      previewResponse: mixedPreviewFixture,
      scenario: { method: 'create', failure: 'SERIES_CONFLICTS' },
    })
    const key = 'idempotency-conflict-1'

    await expect(gateway.create(copy(createRequestFixture), key)).rejects.toMatchObject({
      response: {
        status: 409,
        data: {
          error: {
            code: 'SERIES_CONFLICTS',
            details: { preview: mixedPreviewFixture },
          },
        },
      },
    })
    expect(gateway.state.idempotentCreates).toHaveLength(0)
    expect(gateway.state.series).toHaveLength(0)

    const confirmed = copy(createRequestFixture)
    confirmed.allowConflicts = true
    await expect(gateway.create(confirmed, key)).resolves.toEqual(createResultFixture)
    expect(gateway.state.idempotentCreates).toHaveLength(1)
  })

  it('поддерживает authoritative previewChange для UPDATE и CANCEL без записи состояния серии', async () => {
    const gateway = createMockBookingSeriesGateway({ series: [activeSeriesFixture] })
    const updatePreview = await gateway.previewChange(
      bookingSeriesFixtureIds.series.active,
      previewUpdateRequest(),
    )
    const cancelPreview = await gateway.previewChange(bookingSeriesFixtureIds.series.active, {
      operation: 'CANCEL',
      scope: 'THIS_AND_FUTURE',
      anchorBookingId: bookingSeriesFixtureIds.bookings.activeSecond,
      expectedVersion: activeSeriesFixture.series.version,
    })

    expect(updatePreview).toEqual({
      seriesId: bookingSeriesFixtureIds.series.active,
      version: activeSeriesFixture.series.version,
      result: batchPreviewFixture.result,
    })
    expect(cancelPreview).toEqual({
      seriesId: bookingSeriesFixtureIds.series.active,
      version: activeSeriesFixture.series.version,
      result: batchCancelPreviewFixture.result,
    })
    expect(gateway.state.series[0].series.version).toBe(activeSeriesFixture.series.version)
    expect(gateway.calls.map((call) => call.method)).toEqual(['previewChange', 'previewChange'])
  })

  it('update сохраняет configured result, повышает version и обновляет rule в read state', async () => {
    const authoritativeResult = {
      updated: 41,
      created: 7,
      superseded: 3,
      skipped: [],
      warnings: [],
    }
    const gateway = createMockBookingSeriesGateway({
      series: [activeSeriesFixture],
      updateResult: authoritativeResult,
    })

    const result = await gateway.update(bookingSeriesFixtureIds.series.active, updateRequest())
    expect(result).toEqual({
      series: {
        id: bookingSeriesFixtureIds.series.active,
        status: 'ACTIVE',
        version: 4,
      },
      result: authoritativeResult,
    })
    const updated = await gateway.get(bookingSeriesFixtureIds.series.active)
    expect(updated.series.version).toBe(4)
    expect(updated.series.rule.intervalWeeks).toBe(2)
    expect(updated.series.startDate).toBe(endlessRecurrenceRuleFixture.startDate)
    expect(gateway.state.lastResponses.update).toEqual(result)

    await expect(gateway.update(bookingSeriesFixtureIds.series.active, updateRequest(3)))
      .rejects.toMatchObject({
        response: {
          status: 409,
          data: { error: { code: 'SERIES_VERSION_CONFLICT', details: { actualVersion: 4 } } },
        },
      })
  })

  it('SERIES_CONFLICTS update требует явный allowConflicts и отдаёт configured preview', async () => {
    const authoritativePreview = {
      ...copy(batchPreviewFixture),
      seriesId: bookingSeriesFixtureIds.series.active,
      version: activeSeriesFixture.series.version,
    }
    const gateway = createMockBookingSeriesGateway({
      series: [activeSeriesFixture],
      scenario: {
        method: 'update',
        failure: 'SERIES_CONFLICTS',
        preview: authoritativePreview,
      },
    })

    await expect(gateway.update(bookingSeriesFixtureIds.series.active, updateRequest()))
      .rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: {
              code: 'SERIES_CONFLICTS',
              details: { preview: authoritativePreview },
            },
          },
        },
      })
    await expect(gateway.update(bookingSeriesFixtureIds.series.active, updateRequest(3, true)))
      .resolves.toMatchObject({ series: { version: 4 }, result: batchResultFixture.result })
  })

  it('SERIES_VERSION_CONFLICT изменяет authoritative version, а network сценарий одноразовый', async () => {
    const gateway = createMockBookingSeriesGateway({
      series: [activeSeriesFixture],
      scenario: {
        method: 'previewChange',
        failure: 'SERIES_VERSION_CONFLICT',
        actualVersion: 9,
      },
    })

    await expect(gateway.previewChange(
      bookingSeriesFixtureIds.series.active,
      previewUpdateRequest(),
    )).rejects.toMatchObject({
      response: {
        status: 409,
        data: { error: { code: 'SERIES_VERSION_CONFLICT', details: { actualVersion: 9 } } },
      },
    })
    expect((await gateway.get(bookingSeriesFixtureIds.series.active)).series.version).toBe(9)

    gateway.queueScenario({ method: 'preview', failure: 'network', message: 'offline once' })
    await expect(gateway.preview(copy(previewRequestFixture))).rejects.toMatchObject({
      name: 'MockBookingSeriesNetworkError',
      message: 'offline once',
    })
    await expect(gateway.preview(copy(previewRequestFixture))).resolves.toEqual(cleanPreviewFixture)
  })

  it('cancel SINGLE (включая bodyless) меняет только booking и помечает исключение', async () => {
    const gateway = createMockBookingSeriesGateway({ series: [activeSeriesFixture] })
    const response = await gateway.cancel(bookingSeriesFixtureIds.bookings.activeFirst)

    expect(response).toMatchObject({
      id: bookingSeriesFixtureIds.bookings.activeFirst,
      status: 'CANCELLED',
      series: { id: bookingSeriesFixtureIds.series.active, isException: true, version: 3 },
    })
    const state = await gateway.get(bookingSeriesFixtureIds.series.active)
    expect(state.series.version).toBe(3)
    expect(state.series.exceptionsCount).toBe(1)
    expect(state.bookings.find((booking) => booking.id === bookingSeriesFixtureIds.bookings.activeFirst))
      .toMatchObject({ status: 'CANCELLED', series: { isException: true } })

    await expect(gateway.cancel('booking-unknown', { scope: 'SINGLE' })).rejects.toMatchObject({
      response: { status: 404, data: { error: { code: 'BOOKING_NOT_FOUND' } } },
    })
  })

  it.each<[SeriesBatchActionScope, BookingSeriesStatus]>([
    ['THIS_AND_FUTURE', 'ENDED'],
    ['ALL', 'CANCELLED'],
  ])('cancel %s возвращает batch result и меняет version/status', async (scope, status) => {
    const gateway = createMockBookingSeriesGateway({ series: [activeSeriesFixture] })
    const request: BookingSeriesCancelRequest = {
      scope,
      expectedSeriesVersion: activeSeriesFixture.series.version,
    }
    const response = await gateway.cancel(bookingSeriesFixtureIds.bookings.activeSecond, request)

    expect(response).toEqual({
      series: {
        id: bookingSeriesFixtureIds.series.active,
        status,
        version: 4,
      },
      result: batchCancelResultFixture.result,
    })
    expect(gateway.state.series[0].series).toMatchObject({ status, version: 4 })
  })

  it('fail closed для неподдержанного operation/scope/scenario', async () => {
    const gateway = createMockBookingSeriesGateway({ series: [activeSeriesFixture] })
    const invalidPreview = {
      operation: 'DELETE',
      scope: 'ALL',
      expectedVersion: activeSeriesFixture.series.version,
    } as unknown as BookingSeriesPreviewChangeRequest

    await expect(gateway.previewChange(bookingSeriesFixtureIds.series.active, invalidPreview))
      .rejects.toMatchObject({
        response: { status: 400, data: { error: { code: 'INVALID_SERIES_SCOPE' } } },
      })
    await expect(gateway.cancel(
      bookingSeriesFixtureIds.bookings.activeFirst,
      { scope: 'FUTURE' } as unknown as BookingSeriesCancelRequest,
    )).rejects.toMatchObject({
      response: { status: 400, data: { error: { code: 'INVALID_SERIES_SCOPE' } } },
    })

    expect(() => createMockBookingSeriesGateway({
      scenario: {
        method: 'get',
        failure: 'SERIES_CONFLICTS',
      } as unknown as MockBookingSeriesScenario,
    })).toThrow('unsupported SERIES_CONFLICTS scenario for get')

    gateway.clearCalls()
    expect(gateway.calls).toEqual([])
  })
})
