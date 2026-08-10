import { create } from 'zustand'
import { scheduleApi } from '@/api/schedule.api'
import type { Schedule } from '@/types'

const CACHE_TTL_MS = 30_000

interface ScheduleState {
  schedule: Schedule | null
  loaded: boolean
  fetchedAt: number | null
  request: Promise<void> | null
  fetchSchedule: (force?: boolean) => Promise<void>
  setSchedule: (schedule: Schedule) => void
  reset: () => void
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedule: null,
  loaded: false,
  fetchedAt: null,
  request: null,

  fetchSchedule: (force = false) => {
    const state = get()
    if (state.request) return state.request
    const fresh = state.fetchedAt !== null && Date.now() - state.fetchedAt < CACHE_TTL_MS
    if (!force && state.loaded && fresh) return Promise.resolve()

    const request = scheduleApi.get()
      .then((schedule) => set({ schedule, loaded: true, fetchedAt: Date.now() }))
      .catch(() => set({ loaded: true }))
      .finally(() => set({ request: null }))
    set({ request })
    return request
  },

  setSchedule: (schedule) => set({ schedule, loaded: true, fetchedAt: Date.now() }),

  reset: () => set({ schedule: null, loaded: false, fetchedAt: null, request: null }),
}))
