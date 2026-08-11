import type { Booking, BookingSeriesReference } from '@/types'

export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type RecurrenceIntervalWeeks = 1 | 2

export type SeriesActionScope = 'SINGLE' | 'THIS_AND_FUTURE' | 'ALL'
export type SeriesBatchActionScope = Exclude<SeriesActionScope, 'SINGLE'>
export type BookingSeriesStatus = 'ACTIVE' | 'ENDED' | 'CANCELLED'

export type SeriesWarningType =
  | 'BOOKING_OVERLAP'
  | 'OUTSIDE_WORKING_HOURS'
  | 'BREAK_OVERLAP'
  | 'PAYMENT_REQUIRES_MANUAL_ACTION'

export type SeriesSkippedReason =
  | 'LOCAL_EXCEPTION'
  | 'PAYMENT_REQUIRES_MANUAL_ACTION'

export interface RecurrenceSlot {
  dayOfWeek: IsoWeekday
  time: string
}

export interface RecurrenceRule {
  startDate: string
  endDate: string | null
  intervalWeeks: RecurrenceIntervalWeeks
  timezone: string
  slots: RecurrenceSlot[]
}

export interface BookingSeriesTemplateService {
  serviceId: string
  price: number | null
}

export interface BookingSeriesTemplate {
  clientId: string | null
  masterClientId: string | null
  services: BookingSeriesTemplateService[]
  totalPrice: number | null
  durationMinutes: number
  clientAddress: string | null
  notes: string | null
  remind: boolean
  color: string | null
}

export interface SeriesOccurrenceDate {
  date: string
  time: string
}

export interface SeriesWarning {
  type: SeriesWarningType
  message: string
}

export interface SeriesOccurrencePreview extends SeriesOccurrenceDate {
  warnings: SeriesWarning[]
}

export interface SeriesSkippedBooking {
  bookingId: string
  reason: SeriesSkippedReason
}

export interface BookingSeriesReceipt {
  id: string
  status: BookingSeriesStatus
  version: number
}

export interface BookingSeriesRuleReadModel {
  intervalWeeks: RecurrenceIntervalWeeks
  slots: RecurrenceSlot[]
}

export interface BookingSeriesCreatedReceipt extends BookingSeriesReceipt {
  timezone: string
  startDate: string
  endDate: string | null
  rule: BookingSeriesRuleReadModel
}

export interface BookingSeriesPreviewRequest {
  masterId: string
  template: BookingSeriesTemplate
  rule: RecurrenceRule
}

export interface BookingSeriesPreviewResponse {
  occurrences: SeriesOccurrencePreview[]
  previewLimit: number
  estimatedTotalOccurrences: number | null
  materializationOccurrences: number
  warningsCount: number
}

export interface BookingSeriesCreateRequest extends BookingSeriesPreviewRequest {
  allowConflicts: boolean
}

export interface BookingSeriesCreateResponse {
  series: BookingSeriesCreatedReceipt
  firstBookingId: string
  materializedCount: number
  warnings: SeriesWarning[]
}

export interface BookingSeriesGetParams {
  cursor?: string
  limit?: number
}

export interface BookingSeriesGetRequest extends BookingSeriesGetParams {
  seriesId: string
}

export interface BookingSeriesClientReadModel {
  id: string
  name: string
  phone: string | null
  photo: string | null
  isMaxUser: boolean
}

export interface BookingSeriesServiceReadModel {
  id: string
  name: string
  duration: number
  price: number
  discountPercent: number | null
  photo: string | null
}

export interface BookingSeriesTemplateServiceReadModel {
  service: BookingSeriesServiceReadModel
  price: number | null
  order: number
}

export interface BookingSeriesTemplateReadModel {
  client: BookingSeriesClientReadModel
  services: BookingSeriesTemplateServiceReadModel[]
  totalPrice: number | null
  durationMinutes: number
  clientAddress: string | null
  notes: string | null
  remind: boolean
  color: string | null
}

export interface BookingSeriesManualActionBooking extends SeriesOccurrenceDate {
  bookingId: string
  paymentStatus: Extract<Booking['paymentStatus'], 'DEPOSIT_PAID' | 'PAID'>
  reason: Extract<SeriesSkippedReason, 'PAYMENT_REQUIRES_MANUAL_ACTION'>
}

export interface BookingSeriesNextOccurrence extends SeriesOccurrenceDate {
  bookingId: string
}

export interface BookingSeriesReadModel extends BookingSeriesReceipt {
  timezone: string
  startDate: string
  endDate: string | null
  rule: BookingSeriesRuleReadModel
  template: BookingSeriesTemplateReadModel
  exceptionsCount: number
  manualActionCount: number
  manualActionBookings: BookingSeriesManualActionBooking[]
  nextOccurrence: BookingSeriesNextOccurrence | null
}

export type BookingSeriesReferenceReadModel = BookingSeriesReference

export type BookingWithSeriesReadModel = Booking & {
  series: BookingSeriesReferenceReadModel | null
}

export type BookingSeriesBookingReadModel = Booking & {
  series: BookingSeriesReferenceReadModel
}

export interface BookingSeriesGetResponse {
  series: BookingSeriesReadModel
  bookings: BookingSeriesBookingReadModel[]
  nextCursor: string | null
}

type AtLeastOne<T> = {
  [Key in keyof T]-?: Required<Pick<T, Key>> & Partial<Omit<T, Key>>
}[keyof T]

export type BookingSeriesTemplateChanges = AtLeastOne<BookingSeriesTemplate>

export type BookingSeriesChanges =
  | {
      template: BookingSeriesTemplateChanges
      rule?: RecurrenceRule
    }
  | {
      template?: BookingSeriesTemplateChanges
      rule: RecurrenceRule
    }

type BookingSeriesBatchTarget =
  | {
      scope: 'THIS_AND_FUTURE'
      anchorBookingId: string
    }
  | {
      scope: 'ALL'
      anchorBookingId?: string
    }

export type BookingSeriesUpdateRequest = BookingSeriesBatchTarget & {
  expectedVersion: number
  allowConflicts: boolean
  changes: BookingSeriesChanges
}

export interface BookingSeriesUpdateResult {
  updated: number
  created: number
  superseded: number
  skipped: SeriesSkippedBooking[]
  warnings: SeriesWarning[]
}

export interface BookingSeriesUpdateResponse {
  series: BookingSeriesReceipt
  result: BookingSeriesUpdateResult
}

export type BookingSeriesPreviewUpdateRequest = BookingSeriesUpdateRequest & {
  operation: 'UPDATE'
}

export type BookingSeriesPreviewCancelRequest = BookingSeriesBatchTarget & {
  expectedVersion: number
  operation: 'CANCEL'
}

export type BookingSeriesPreviewChangeRequest =
  | BookingSeriesPreviewUpdateRequest
  | BookingSeriesPreviewCancelRequest

export interface BookingSeriesPreviewChangeResult extends BookingSeriesUpdateResult {
  cancelled: number
}

export interface BookingSeriesPreviewChangeResponse {
  seriesId: string
  version: number
  result: BookingSeriesPreviewChangeResult
}

export type BookingSeriesCancelRequest =
  | {
      scope: 'SINGLE'
      expectedSeriesVersion?: never
    }
  | {
      scope: SeriesBatchActionScope
      expectedSeriesVersion: number
    }

export interface BookingSeriesCancelResult {
  cancelled: number
  skipped: SeriesSkippedBooking[]
}

export interface BookingSeriesBatchCancelResponse {
  series: BookingSeriesReceipt
  result: BookingSeriesCancelResult
}

export type BookingSeriesCancelResponse = Booking | BookingSeriesBatchCancelResponse
