import type { Booking } from '@/types'
import type { BookingSeriesGateway } from '@/features/booking-series/gateway'
import type {
  BookingSeriesCancelRequest,
  BookingSeriesCancelResponse,
  BookingSeriesCancelResult,
  BookingSeriesCreateRequest,
  BookingSeriesCreateResponse,
  BookingSeriesGetParams,
  BookingSeriesGetResponse,
  BookingSeriesPreviewChangeRequest,
  BookingSeriesPreviewChangeResponse,
  BookingSeriesPreviewChangeResult,
  BookingSeriesPreviewRequest,
  BookingSeriesPreviewResponse,
  BookingSeriesStatus,
  BookingSeriesUpdateRequest,
  BookingSeriesUpdateResponse,
  BookingSeriesUpdateResult,
  SeriesBatchActionScope,
} from '@/features/booking-series/types'

import {
  activeSeriesFixture,
  batchCancelPreviewFixture,
  batchCancelResultFixture,
  batchPreviewFixture,
  batchResultFixture,
  cancelledSeriesFixture,
  cleanPreviewFixture,
  createResultFixture,
  createdSeriesFixture,
  endedSeriesFixture,
  exceptionsSeriesFixture,
  manualPaymentSeriesFixture,
} from './fixtures'

export type MockBookingSeriesMethod =
  | 'preview'
  | 'create'
  | 'get'
  | 'previewChange'
  | 'update'
  | 'cancel'

interface MockScenarioBase {
  times?: number
}

export type MockBookingSeriesScenario =
  | (MockScenarioBase & {
      method: MockBookingSeriesMethod
      failure: 'network'
      message?: string
    })
  | (MockScenarioBase & {
      method: 'create'
      failure: 'SERIES_CONFLICTS'
      preview?: BookingSeriesPreviewResponse
    })
  | (MockScenarioBase & {
      method: 'update'
      failure: 'SERIES_CONFLICTS'
      preview?: BookingSeriesPreviewChangeResponse
    })
  | (MockScenarioBase & {
      method: 'previewChange' | 'update' | 'cancel'
      failure: 'SERIES_VERSION_CONFLICT'
      actualVersion?: number
      seriesId?: string
    })

export interface MockBatchCancelConfig {
  status?: BookingSeriesStatus
  result: BookingSeriesCancelResult
}

export interface MockBookingSeriesGatewayOptions {
  /** Full, unpaginated read responses. */
  series?: readonly BookingSeriesGetResponse[]
  defaultPageSize?: number
  previewResponse?: BookingSeriesPreviewResponse
  createResponse?: BookingSeriesCreateResponse
  /** Read model inserted after create. null keeps only the create receipt. */
  createdSeries?: BookingSeriesGetResponse | null
  previewChangeResults?: Partial<Record<'UPDATE' | 'CANCEL', BookingSeriesPreviewChangeResult>>
  updateResult?: BookingSeriesUpdateResult
  updateStatus?: BookingSeriesStatus
  batchCancel?: Partial<Record<SeriesBatchActionScope, MockBatchCancelConfig>>
  singleCancelResponses?: Readonly<Record<string, Booking>>
  scenario?: MockBookingSeriesScenario | readonly MockBookingSeriesScenario[]
}

export type MockBookingSeriesGatewayCall =
  | { method: 'preview'; request: BookingSeriesPreviewRequest }
  | { method: 'create'; request: BookingSeriesCreateRequest; idempotencyKey: string }
  | { method: 'get'; seriesId: string; params: BookingSeriesGetParams | undefined }
  | { method: 'previewChange'; seriesId: string; request: BookingSeriesPreviewChangeRequest }
  | { method: 'update'; seriesId: string; request: BookingSeriesUpdateRequest }
  | { method: 'cancel'; bookingId: string; request: BookingSeriesCancelRequest | undefined }

export interface MockBookingSeriesGatewayState {
  series: BookingSeriesGetResponse[]
  idempotentCreates: Array<{
    idempotencyKey: string
    response: BookingSeriesCreateResponse
  }>
  lastResponses: {
    preview: BookingSeriesPreviewResponse | null
    create: BookingSeriesCreateResponse | null
    get: BookingSeriesGetResponse | null
    previewChange: BookingSeriesPreviewChangeResponse | null
    update: BookingSeriesUpdateResponse | null
    cancel: BookingSeriesCancelResponse | null
  }
}

export interface MockBookingSeriesGateway extends BookingSeriesGateway {
  readonly calls: readonly MockBookingSeriesGatewayCall[]
  readonly state: MockBookingSeriesGatewayState
  clearCalls(): void
  queueScenario(scenario: MockBookingSeriesScenario): void
}

export interface MockBookingSeriesApiError extends Error {
  response: {
    status: number
    data: {
      error: {
        code: string
        message: string
        details?: {
          actualVersion?: number
          preview?: BookingSeriesPreviewResponse | BookingSeriesPreviewChangeResponse
        }
      }
    }
  }
}

interface QueuedScenario {
  scenario: MockBookingSeriesScenario
  remaining: number
}

interface StoredCreate {
  fingerprint: string
  response: BookingSeriesCreateResponse
}

const defaultSeries = [
  activeSeriesFixture,
  exceptionsSeriesFixture,
  manualPaymentSeriesFixture,
  endedSeriesFixture,
  cancelledSeriesFixture,
]

const supportedMethods: readonly MockBookingSeriesMethod[] = [
  'preview',
  'create',
  'get',
  'previewChange',
  'update',
  'cancel',
]

function clone<T>(value: T): T {
  return structuredClone(value)
}

function apiError(
  status: number,
  code: string,
  message: string,
  details?: MockBookingSeriesApiError['response']['data']['error']['details'],
): MockBookingSeriesApiError {
  const error = new Error(message) as MockBookingSeriesApiError
  error.name = 'MockBookingSeriesApiError'
  error.response = {
    status,
    data: {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details: clone(details) }),
      },
    },
  }
  return error
}

function networkError(message = 'Mock BookingSeriesGateway network failure'): Error {
  const error = new Error(message)
  error.name = 'MockBookingSeriesNetworkError'
  return error
}

function setupError(message: string): Error {
  return new Error(`Invalid BookingSeriesGateway mock configuration: ${message}`)
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
    .join(',')}}`
}

function createFingerprint(request: BookingSeriesCreateRequest): string {
  const { allowConflicts: _allowConflicts, ...canonicalRequest } = request
  return stableSerialize(canonicalRequest)
}

function validateScenario(scenario: MockBookingSeriesScenario): void {
  const candidate = scenario as MockBookingSeriesScenario & { method: string; failure: string }
  if (!supportedMethods.includes(candidate.method as MockBookingSeriesMethod)) {
    throw setupError(`unsupported method in scenario: ${candidate.method}`)
  }
  if (scenario.times !== undefined && (!Number.isInteger(scenario.times) || scenario.times <= 0)) {
    throw setupError('scenario.times must be a positive integer')
  }

  if (candidate.failure === 'network') return
  if (candidate.failure === 'SERIES_CONFLICTS' && (candidate.method === 'create' || candidate.method === 'update')) {
    return
  }
  if (
    candidate.failure === 'SERIES_VERSION_CONFLICT'
      && (candidate.method === 'previewChange' || candidate.method === 'update' || candidate.method === 'cancel')
  ) {
    const actualVersion = (scenario as Extract<MockBookingSeriesScenario, { failure: 'SERIES_VERSION_CONFLICT' }>).actualVersion
    if (actualVersion !== undefined && (!Number.isInteger(actualVersion) || actualVersion < 1)) {
      throw setupError('scenario.actualVersion must be a positive integer')
    }
    return
  }

  throw setupError(`unsupported ${candidate.failure} scenario for ${candidate.method}`)
}

export function createMockBookingSeriesGateway(
  options: MockBookingSeriesGatewayOptions = {},
): MockBookingSeriesGateway {
  const defaultPageSize = options.defaultPageSize ?? 30
  if (!Number.isInteger(defaultPageSize) || defaultPageSize < 1) {
    throw setupError('defaultPageSize must be a positive integer')
  }

  const previewResponse = clone(options.previewResponse ?? cleanPreviewFixture)
  const createResponse = clone(options.createResponse ?? createResultFixture)
  const configuredCreatedSeries = options.createdSeries !== undefined
    ? clone(options.createdSeries)
    : options.createResponse === undefined
      ? clone(createdSeriesFixture)
      : null
  const previewChangeResults: Record<'UPDATE' | 'CANCEL', BookingSeriesPreviewChangeResult> = {
    UPDATE: clone(options.previewChangeResults?.UPDATE ?? batchPreviewFixture.result),
    CANCEL: clone(options.previewChangeResults?.CANCEL ?? batchCancelPreviewFixture.result),
  }
  const updateResult = clone(options.updateResult ?? batchResultFixture.result)
  const batchCancel: Record<SeriesBatchActionScope, MockBatchCancelConfig> = {
    THIS_AND_FUTURE: clone(options.batchCancel?.THIS_AND_FUTURE ?? {
      status: 'ENDED',
      result: batchCancelResultFixture.result,
    }),
    ALL: clone(options.batchCancel?.ALL ?? {
      status: 'CANCELLED',
      result: batchCancelResultFixture.result,
    }),
  }
  const singleCancelResponses = new Map(
    Object.entries(clone(options.singleCancelResponses ?? {})),
  )

  if (configuredCreatedSeries && configuredCreatedSeries.series.id !== createResponse.series.id) {
    throw setupError('createdSeries.series.id must match createResponse.series.id')
  }
  if (
    configuredCreatedSeries
      && !configuredCreatedSeries.bookings.some((booking) => booking.id === createResponse.firstBookingId)
  ) {
    throw setupError('createdSeries must contain createResponse.firstBookingId')
  }

  const seriesById = new Map<string, BookingSeriesGetResponse>()
  const callLog: MockBookingSeriesGatewayCall[] = []
  const scenarios: QueuedScenario[] = []
  const successfulCreates = new Map<string, StoredCreate>()
  const lastResponses: MockBookingSeriesGatewayState['lastResponses'] = {
    preview: null,
    create: null,
    get: null,
    previewChange: null,
    update: null,
    cancel: null,
  }

  function insertSeries(source: BookingSeriesGetResponse): void {
    const data = clone(source)
    const seriesId = data.series.id.trim()
    if (!seriesId) throw setupError('series id must not be empty')
    if (seriesById.has(seriesId)) throw setupError(`duplicate series id: ${seriesId}`)

    const existingBookingIds = new Set(
      [...seriesById.values()].flatMap((series) => series.bookings.map((booking) => booking.id)),
    )
    const localBookingIds = new Set<string>()
    for (const booking of data.bookings) {
      if (!booking.id.trim()) throw setupError(`empty booking id in series ${seriesId}`)
      if (booking.series.id !== seriesId) {
        throw setupError(`booking ${booking.id} points to series ${booking.series.id}, expected ${seriesId}`)
      }
      if (existingBookingIds.has(booking.id) || localBookingIds.has(booking.id)) {
        throw setupError(`duplicate booking id: ${booking.id}`)
      }
      localBookingIds.add(booking.id)
    }

    data.series.id = seriesId
    seriesById.set(seriesId, data)
  }

  for (const fixture of options.series ?? defaultSeries) insertSeries(fixture)

  function queueScenario(scenario: MockBookingSeriesScenario): void {
    validateScenario(scenario)
    scenarios.push({ scenario: clone(scenario), remaining: scenario.times ?? 1 })
  }

  const initialScenarios: readonly MockBookingSeriesScenario[] = options.scenario === undefined
    ? []
    : Array.isArray(options.scenario)
      ? options.scenario
      : [options.scenario as MockBookingSeriesScenario]
  initialScenarios.forEach(queueScenario)

  function takeScenario(
    method: MockBookingSeriesMethod,
    seriesId?: string,
    acceptVersionConflict = true,
  ): MockBookingSeriesScenario | undefined {
    const index = scenarios.findIndex(({ scenario }) => {
      if (scenario.method !== method) return false
      if (scenario.failure === 'SERIES_VERSION_CONFLICT') {
        if (!acceptVersionConflict) return false
        if (scenario.seriesId !== undefined && scenario.seriesId !== seriesId) return false
      }
      return true
    })
    if (index < 0) return undefined

    const queued = scenarios[index]
    queued.remaining -= 1
    if (queued.remaining === 0) scenarios.splice(index, 1)
    return clone(queued.scenario)
  }

  function record(call: MockBookingSeriesGatewayCall): void {
    callLog.push(clone(call))
  }

  function requireSeries(seriesId: string): BookingSeriesGetResponse {
    const data = seriesById.get(seriesId)
    if (!data) throw apiError(404, 'SERIES_NOT_FOUND', `Unknown booking series: ${seriesId}`)
    return data
  }

  function requireBooking(bookingId: string): {
    data: BookingSeriesGetResponse
    index: number
  } {
    for (const data of seriesById.values()) {
      const index = data.bookings.findIndex((booking) => booking.id === bookingId)
      if (index >= 0) return { data, index }
    }
    throw apiError(404, 'BOOKING_NOT_FOUND', `Unknown series booking: ${bookingId}`)
  }

  function requireActive(data: BookingSeriesGetResponse): void {
    if (data.series.status !== 'ACTIVE') {
      throw apiError(422, 'SERIES_NOT_ACTIVE', `Booking series ${data.series.id} is not active`)
    }
  }

  function requireExpectedVersion(expectedVersion: number, data: BookingSeriesGetResponse): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw apiError(400, 'INVALID_SERIES_SCOPE', 'expectedVersion must be a positive integer')
    }
    if (expectedVersion !== data.series.version) {
      throw apiError(409, 'SERIES_VERSION_CONFLICT', 'Booking series version is stale', {
        actualVersion: data.series.version,
      })
    }
  }

  function requireBatchTarget(
    seriesId: string,
    request: { scope: unknown; anchorBookingId?: unknown },
  ): SeriesBatchActionScope {
    if (request.scope !== 'THIS_AND_FUTURE' && request.scope !== 'ALL') {
      throw apiError(400, 'INVALID_SERIES_SCOPE', `Unsupported batch scope: ${String(request.scope)}`)
    }

    if (request.scope === 'THIS_AND_FUTURE' && (
      typeof request.anchorBookingId !== 'string' || !request.anchorBookingId.trim()
    )) {
      throw apiError(400, 'INVALID_SERIES_SCOPE', 'THIS_AND_FUTURE requires anchorBookingId')
    }
    if (request.anchorBookingId !== undefined) {
      if (typeof request.anchorBookingId !== 'string' || !request.anchorBookingId.trim()) {
        throw apiError(400, 'INVALID_SERIES_SCOPE', 'anchorBookingId must not be empty')
      }
      const anchor = requireBooking(request.anchorBookingId)
      if (anchor.data.series.id !== seriesId) {
        throw apiError(404, 'BOOKING_NOT_FOUND', `Booking ${request.anchorBookingId} is not in series ${seriesId}`)
      }
    }
    return request.scope
  }

  function setSeriesReceipt(
    data: BookingSeriesGetResponse,
    version: number,
    status: BookingSeriesStatus,
  ): void {
    data.series.version = version
    data.series.status = status
    for (const booking of data.bookings) {
      booking.series.version = version
      booking.series.status = status
    }
    if (status !== 'ACTIVE') data.series.nextOccurrence = null
  }

  function throwVersionScenario(
    scenario: Extract<MockBookingSeriesScenario, { failure: 'SERIES_VERSION_CONFLICT' }>,
    data: BookingSeriesGetResponse,
  ): never {
    const actualVersion = scenario.actualVersion ?? data.series.version + 1
    setSeriesReceipt(data, actualVersion, data.series.status)
    throw apiError(409, 'SERIES_VERSION_CONFLICT', 'Configured booking series version conflict', {
      actualVersion,
    })
  }

  function throwUnexpectedScenario(method: MockBookingSeriesMethod, scenario: MockBookingSeriesScenario): never {
    throw setupError(`unsupported ${scenario.failure} scenario reached ${method}`)
  }

  const preview: BookingSeriesGateway['preview'] = async (request) => {
    const requestSnapshot = clone(request)
    record({ method: 'preview', request: requestSnapshot })
    const scenario = takeScenario('preview')
    if (scenario) {
      if (scenario.failure === 'network') throw networkError(scenario.message)
      throwUnexpectedScenario('preview', scenario)
    }

    lastResponses.preview = clone(previewResponse)
    return clone(previewResponse)
  }

  const create: BookingSeriesGateway['create'] = async (request, idempotencyKey) => {
    const requestSnapshot = clone(request)
    record({ method: 'create', request: requestSnapshot, idempotencyKey })
    if (!idempotencyKey.trim()) {
      throw apiError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency key must not be empty')
    }

    const fingerprint = createFingerprint(requestSnapshot)
    const cached = successfulCreates.get(idempotencyKey)
    if (cached) {
      if (cached.fingerprint !== fingerprint) {
        throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was reused with another payload')
      }
      lastResponses.create = clone(cached.response)
      return clone(cached.response)
    }

    const scenario = takeScenario('create')
    if (scenario) {
      if (scenario.failure === 'network') throw networkError(scenario.message)
      if (scenario.failure === 'SERIES_CONFLICTS') {
        if (!requestSnapshot.allowConflicts) {
          throw apiError(409, 'SERIES_CONFLICTS', 'Configured booking series conflicts', {
            preview: scenario.preview ?? previewResponse,
          })
        }
      } else {
        throwUnexpectedScenario('create', scenario)
      }
    }

    const duplicateReceipt = [...successfulCreates.values()]
      .some((created) => created.response.series.id === createResponse.series.id)
    if (duplicateReceipt || seriesById.has(createResponse.series.id)) {
      throw setupError(`createResponse series ${createResponse.series.id} was already created by another call`)
    }

    if (configuredCreatedSeries) {
      const created = clone(configuredCreatedSeries)
      created.series.timezone = createResponse.series.timezone
      created.series.startDate = createResponse.series.startDate
      created.series.endDate = createResponse.series.endDate
      created.series.rule = clone(createResponse.series.rule)
      setSeriesReceipt(created, createResponse.series.version, createResponse.series.status)
      insertSeries(created)
    }

    const stored = { fingerprint, response: clone(createResponse) }
    successfulCreates.set(idempotencyKey, stored)
    lastResponses.create = clone(createResponse)
    return clone(createResponse)
  }

  const get: BookingSeriesGateway['get'] = async (seriesId, params) => {
    const paramsSnapshot = clone(params)
    record({ method: 'get', seriesId, params: paramsSnapshot })
    const data = requireSeries(seriesId)
    const scenario = takeScenario('get', seriesId)
    if (scenario) {
      if (scenario.failure === 'network') throw networkError(scenario.message)
      throwUnexpectedScenario('get', scenario)
    }

    const limit = paramsSnapshot?.limit ?? defaultPageSize
    if (!Number.isInteger(limit) || limit < 1) {
      throw apiError(400, 'INVALID_PAGINATION', 'Pagination limit must be a positive integer')
    }

    let start = 0
    if (paramsSnapshot?.cursor !== undefined) {
      const cursorIndex = data.bookings.findIndex((booking) => booking.id === paramsSnapshot.cursor)
      if (cursorIndex < 0) {
        throw apiError(404, 'BOOKING_NOT_FOUND', `Unknown cursor booking: ${paramsSnapshot.cursor}`)
      }
      start = cursorIndex + 1
    }
    const bookings = data.bookings.slice(start, start + limit)
    const hasMore = start + bookings.length < data.bookings.length
    const response: BookingSeriesGetResponse = {
      series: clone(data.series),
      bookings: clone(bookings),
      nextCursor: hasMore ? bookings[bookings.length - 1]?.id ?? null : null,
    }

    lastResponses.get = clone(response)
    return clone(response)
  }

  const previewChange: BookingSeriesGateway['previewChange'] = async (seriesId, request) => {
    const requestSnapshot = clone(request)
    record({ method: 'previewChange', seriesId, request: requestSnapshot })
    const data = requireSeries(seriesId)
    requireActive(data)
    const operation = (requestSnapshot as { operation?: unknown }).operation
    if (operation !== 'UPDATE' && operation !== 'CANCEL') {
      throw apiError(400, 'INVALID_SERIES_SCOPE', `Unsupported preview-change operation: ${String(operation)}`)
    }
    requireBatchTarget(seriesId, requestSnapshot)

    const scenario = takeScenario('previewChange', seriesId)
    if (scenario) {
      if (scenario.failure === 'network') throw networkError(scenario.message)
      if (scenario.failure === 'SERIES_VERSION_CONFLICT') throwVersionScenario(scenario, data)
      throwUnexpectedScenario('previewChange', scenario)
    }
    requireExpectedVersion(requestSnapshot.expectedVersion, data)

    const response: BookingSeriesPreviewChangeResponse = {
      seriesId,
      version: data.series.version,
      result: clone(previewChangeResults[operation]),
    }
    lastResponses.previewChange = clone(response)
    return clone(response)
  }

  const update: BookingSeriesGateway['update'] = async (seriesId, request) => {
    const requestSnapshot = clone(request)
    record({ method: 'update', seriesId, request: requestSnapshot })
    const data = requireSeries(seriesId)
    requireActive(data)
    requireBatchTarget(seriesId, requestSnapshot)

    const scenario = takeScenario('update', seriesId)
    if (scenario) {
      if (scenario.failure === 'network') throw networkError(scenario.message)
      if (scenario.failure === 'SERIES_VERSION_CONFLICT') throwVersionScenario(scenario, data)
      if (scenario.failure === 'SERIES_CONFLICTS') {
        if (!requestSnapshot.allowConflicts) {
          throw apiError(409, 'SERIES_CONFLICTS', 'Configured booking series conflicts', {
            preview: scenario.preview ?? {
              seriesId,
              version: data.series.version,
              result: previewChangeResults.UPDATE,
            },
          })
        }
      } else {
        throwUnexpectedScenario('update', scenario)
      }
    }
    requireExpectedVersion(requestSnapshot.expectedVersion, data)

    const nextVersion = data.series.version + 1
    const nextStatus = options.updateStatus ?? data.series.status
    if (requestSnapshot.changes.rule) {
      const rule = requestSnapshot.changes.rule
      data.series.timezone = rule.timezone
      data.series.startDate = rule.startDate
      data.series.endDate = rule.endDate
      data.series.rule = {
        intervalWeeks: rule.intervalWeeks,
        slots: clone(rule.slots),
      }
    }
    setSeriesReceipt(data, nextVersion, nextStatus)

    const response: BookingSeriesUpdateResponse = {
      series: { id: seriesId, status: nextStatus, version: nextVersion },
      result: clone(updateResult),
    }
    lastResponses.update = clone(response)
    return clone(response)
  }

  const cancel: BookingSeriesGateway['cancel'] = async (bookingId, request) => {
    const requestSnapshot = clone(request)
    record({ method: 'cancel', bookingId, request: requestSnapshot })
    if (requestSnapshot !== undefined && (requestSnapshot === null || typeof requestSnapshot !== 'object')) {
      throw apiError(400, 'INVALID_SERIES_SCOPE', 'Cancel request must be an object')
    }
    const scope = requestSnapshot?.scope ?? 'SINGLE'
    if (scope !== 'SINGLE' && scope !== 'THIS_AND_FUTURE' && scope !== 'ALL') {
      throw apiError(400, 'INVALID_SERIES_SCOPE', `Unsupported cancel scope: ${String(scope)}`)
    }

    const target = requireBooking(bookingId)
    const data = target.data
    if (scope === 'SINGLE') {
      if (requestSnapshot && 'expectedSeriesVersion' in requestSnapshot) {
        throw apiError(400, 'INVALID_SERIES_SCOPE', 'SINGLE must not include expectedSeriesVersion')
      }
      const scenario = takeScenario('cancel', data.series.id, false)
      if (scenario) {
        if (scenario.failure === 'network') throw networkError(scenario.message)
        throwUnexpectedScenario('cancel', scenario)
      }

      const current = data.bookings[target.index]
      const configured = singleCancelResponses.get(bookingId)
      const response: Booking = configured
        ? clone(configured)
        : {
            ...clone(current),
            status: 'CANCELLED',
            series: { ...clone(current.series), isException: true },
          }
      if (
        response.id !== bookingId
          || response.status !== 'CANCELLED'
          || !response.series
          || response.series.id !== data.series.id
      ) {
        throw setupError(`singleCancelResponses.${bookingId} must be a cancelled booking from the same series`)
      }

      if (!current.series.isException && response.series.isException) data.series.exceptionsCount += 1
      data.bookings[target.index] = clone(response) as typeof current
      lastResponses.cancel = clone(response)
      return clone(response)
    }

    requireActive(data)
    const batchRequest = requestSnapshot as Extract<BookingSeriesCancelRequest, { scope: SeriesBatchActionScope }>
    if (!Number.isInteger(batchRequest.expectedSeriesVersion) || batchRequest.expectedSeriesVersion < 1) {
      throw apiError(400, 'INVALID_SERIES_SCOPE', 'Batch cancel requires expectedSeriesVersion')
    }
    const scenario = takeScenario('cancel', data.series.id)
    if (scenario) {
      if (scenario.failure === 'network') throw networkError(scenario.message)
      if (scenario.failure === 'SERIES_VERSION_CONFLICT') throwVersionScenario(scenario, data)
      throwUnexpectedScenario('cancel', scenario)
    }
    requireExpectedVersion(batchRequest.expectedSeriesVersion, data)

    const configured = batchCancel[scope]
    const nextVersion = data.series.version + 1
    const nextStatus = configured.status ?? data.series.status
    setSeriesReceipt(data, nextVersion, nextStatus)
    const response: BookingSeriesCancelResponse = {
      series: { id: data.series.id, status: nextStatus, version: nextVersion },
      result: clone(configured.result),
    }
    lastResponses.cancel = clone(response)
    return clone(response)
  }

  return {
    preview,
    create,
    get,
    previewChange,
    update,
    cancel,
    get calls() {
      return clone(callLog)
    },
    get state() {
      return clone({
        series: [...seriesById.values()],
        idempotentCreates: [...successfulCreates.entries()].map(([idempotencyKey, stored]) => ({
          idempotencyKey,
          response: stored.response,
        })),
        lastResponses,
      })
    },
    clearCalls() {
      callLog.length = 0
    },
    queueScenario,
  }
}
