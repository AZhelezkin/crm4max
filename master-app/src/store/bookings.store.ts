import { create } from 'zustand'
import { bookingsApi } from '@/api/bookings.api'
import type { Booking } from '@/types'

const CACHE_TTL_MS = 30_000

interface BookingsState {
  bookings: Booking[]
  loaded: boolean
  refreshing: boolean
  fetchedAt: number | null
  request: Promise<void> | null
  fetchBookings: (force?: boolean) => Promise<void>
  upsertBooking: (booking: Booking) => void
  invalidate: () => void
  reset: () => void
}

export const useBookingsStore = create<BookingsState>((set, get) => ({
  bookings: [],
  loaded: false,
  refreshing: false,
  fetchedAt: null,
  request: null,

  fetchBookings: (force = false) => {
    const currentRequest = get().request
    if (currentRequest) return currentRequest

    const { loaded, fetchedAt } = get()
    const fresh = fetchedAt !== null && Date.now() - fetchedAt < CACHE_TTL_MS
    if (!force && loaded && fresh) return Promise.resolve()

    set({ refreshing: true })
    const request = bookingsApi.list()
      .then((bookings) => set({ bookings, loaded: true, fetchedAt: Date.now() }))
      .catch(() => set({ loaded: true }))
      .finally(() => {
        set({ refreshing: false, request: null })
      })
    set({ request })
    return request
  },

  upsertBooking: (booking) => set((state) => ({
    bookings: state.bookings.some((item) => item.id === booking.id)
      ? state.bookings.map((item) => item.id === booking.id ? booking : item)
      : [...state.bookings, booking],
  })),

  invalidate: () => set({ fetchedAt: null }),

  reset: () => set({ bookings: [], loaded: false, refreshing: false, fetchedAt: null, request: null }),
}))
