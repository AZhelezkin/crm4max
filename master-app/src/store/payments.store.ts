import { create } from 'zustand'
import { paymentsApi } from '@/api/payments.api'
import type { Payment } from '@/types'

const CACHE_TTL_MS = 30_000

interface PaymentsState {
  payments: Payment[]
  loaded: boolean
  fetchedAt: number | null
  request: Promise<void> | null
  fetchPayments: (force?: boolean) => Promise<void>
  reset: () => void
}

export const usePaymentsStore = create<PaymentsState>((set, get) => ({
  payments: [],
  loaded: false,
  fetchedAt: null,
  request: null,

  fetchPayments: (force = false) => {
    const state = get()
    if (state.request) return state.request
    const fresh = state.fetchedAt !== null && Date.now() - state.fetchedAt < CACHE_TTL_MS
    if (!force && state.loaded && fresh) return Promise.resolve()

    const request = paymentsApi.list()
      .then((payments) => set({ payments, loaded: true, fetchedAt: Date.now() }))
      .catch(() => set({ loaded: true }))
      .finally(() => set({ request: null }))
    set({ request })
    return request
  },

  reset: () => set({ payments: [], loaded: false, fetchedAt: null, request: null }),
}))
