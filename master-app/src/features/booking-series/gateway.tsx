import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

import type {
  BookingSeriesCancelRequest,
  BookingSeriesCancelResponse,
  BookingSeriesCreateRequest,
  BookingSeriesCreateResponse,
  BookingSeriesGetParams,
  BookingSeriesGetResponse,
  BookingSeriesPreviewChangeRequest,
  BookingSeriesPreviewChangeResponse,
  BookingSeriesPreviewRequest,
  BookingSeriesPreviewResponse,
  BookingSeriesUpdateRequest,
  BookingSeriesUpdateResponse,
} from './types'

export interface BookingSeriesGateway {
  preview(request: BookingSeriesPreviewRequest): Promise<BookingSeriesPreviewResponse>
  create(request: BookingSeriesCreateRequest, idempotencyKey: string): Promise<BookingSeriesCreateResponse>
  get(seriesId: string, params?: BookingSeriesGetParams): Promise<BookingSeriesGetResponse>
  previewChange(
    seriesId: string,
    request: BookingSeriesPreviewChangeRequest,
  ): Promise<BookingSeriesPreviewChangeResponse>
  update(seriesId: string, request: BookingSeriesUpdateRequest): Promise<BookingSeriesUpdateResponse>
  cancel(
    bookingId: string,
    request?: BookingSeriesCancelRequest,
  ): Promise<BookingSeriesCancelResponse>
}

export interface BookingSeriesGatewayState {
  enabled: boolean
  gateway: BookingSeriesGateway | undefined
}

export interface BookingSeriesGatewayProviderProps {
  enabled: boolean
  gateway?: BookingSeriesGateway
  children: ReactNode
}

const BookingSeriesGatewayContext = createContext<BookingSeriesGatewayState>({ enabled: false, gateway: undefined })

export function BookingSeriesGatewayProvider({
  enabled,
  gateway,
  children,
}: BookingSeriesGatewayProviderProps) {
  return (
    <BookingSeriesGatewayContext.Provider value={{ enabled, gateway }}>
      {children}
    </BookingSeriesGatewayContext.Provider>
  )
}

export function useBookingSeriesGateway(): BookingSeriesGatewayState {
  const context = useContext(BookingSeriesGatewayContext)

  if (context.enabled && !context.gateway) {
    throw new Error('Booking series is enabled, but no BookingSeriesGateway was provided')
  }

  return context
}
