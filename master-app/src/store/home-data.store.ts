import { create } from 'zustand'
import { clientsApi } from '@/api/clients.api'
import { subscriptionApi, type SubscriptionState } from '@/api/subscription.api'
import type { Client } from '@/types'

const CACHE_TTL_MS = 30_000

interface HomeDataState {
  clients: Client[]
  clientsLoaded: boolean
  clientsFetchedAt: number | null
  clientsRequest: Promise<void> | null
  subscription: SubscriptionState | null
  subscriptionLoaded: boolean
  subscriptionFetchedAt: number | null
  subscriptionRequest: Promise<void> | null
  fetchClients: (force?: boolean) => Promise<void>
  fetchSubscription: (force?: boolean) => Promise<void>
  setSubscription: (subscription: SubscriptionState | null) => void
  reset: () => void
}

const isFresh = (fetchedAt: number | null) =>
  fetchedAt !== null && Date.now() - fetchedAt < CACHE_TTL_MS

export const useHomeDataStore = create<HomeDataState>((set, get) => ({
  clients: [],
  clientsLoaded: false,
  clientsFetchedAt: null,
  clientsRequest: null,
  subscription: null,
  subscriptionLoaded: false,
  subscriptionFetchedAt: null,
  subscriptionRequest: null,

  fetchClients: (force = false) => {
    const state = get()
    if (state.clientsRequest) return state.clientsRequest
    if (!force && state.clientsLoaded && isFresh(state.clientsFetchedAt)) return Promise.resolve()

    const request = clientsApi.list()
      .then((clients) => set({ clients, clientsLoaded: true, clientsFetchedAt: Date.now() }))
      .catch(() => set({ clientsLoaded: true }))
      .finally(() => set({ clientsRequest: null }))
    set({ clientsRequest: request })
    return request
  },

  fetchSubscription: (force = false) => {
    const state = get()
    if (state.subscriptionRequest) return state.subscriptionRequest
    if (!force && state.subscriptionLoaded && isFresh(state.subscriptionFetchedAt)) return Promise.resolve()

    const request = subscriptionApi.getMe()
      .then((subscription) => set({
        subscription,
        subscriptionLoaded: true,
        subscriptionFetchedAt: Date.now(),
      }))
      .catch(() => set({ subscriptionLoaded: true }))
      .finally(() => set({ subscriptionRequest: null }))
    set({ subscriptionRequest: request })
    return request
  },

  setSubscription: (subscription) => set({
    subscription,
    subscriptionLoaded: true,
    subscriptionFetchedAt: Date.now(),
  }),

  reset: () => set({
    clients: [],
    clientsLoaded: false,
    clientsFetchedAt: null,
    clientsRequest: null,
    subscription: null,
    subscriptionLoaded: false,
    subscriptionFetchedAt: null,
    subscriptionRequest: null,
  }),
}))
