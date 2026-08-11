import { api } from '@/api/client'

import type { BookingSeriesGateway } from './gateway'
import type {
  BookingSeriesCancelResponse,
  BookingSeriesCreateResponse,
  BookingSeriesGetResponse,
  BookingSeriesPreviewChangeResponse,
  BookingSeriesPreviewResponse,
  BookingSeriesUpdateResponse,
} from './types'

export const restBookingSeriesGateway: BookingSeriesGateway = {
  preview: (request) =>
    api.post<BookingSeriesPreviewResponse>('/booking-series/preview', request).then((response) => response.data),

  create: (request, idempotencyKey) =>
    api.post<BookingSeriesCreateResponse>('/booking-series', request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }).then((response) => response.data),

  get: (seriesId, params) =>
    api.get<BookingSeriesGetResponse>(`/booking-series/${seriesId}`, { params }).then((response) => response.data),

  previewChange: (seriesId, request) =>
    api.post<BookingSeriesPreviewChangeResponse>(`/booking-series/${seriesId}/preview-change`, request)
      .then((response) => response.data),

  update: (seriesId, request) =>
    api.patch<BookingSeriesUpdateResponse>(`/booking-series/${seriesId}`, request)
      .then((response) => response.data),

  cancel: (bookingId, request) =>
    api.post<BookingSeriesCancelResponse>(`/bookings/${bookingId}/cancel`, request)
      .then((response) => response.data),
}
