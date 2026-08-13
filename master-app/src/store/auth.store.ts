import { create } from 'zustand'
import { authApi } from '@/api/auth.api'
import { mastersApi } from '@/api/masters.api'
import type { Master } from '@/types'
import { metricAuthErrorType, setAnalyticsUserId, trackEventOnce } from '@/lib/metrics'
import { useBookingsStore } from '@/store/bookings.store'
import { useHomeDataStore } from '@/store/home-data.store'
import { usePaymentsStore } from '@/store/payments.store'
import { useScheduleStore } from '@/store/schedule.store'
import { readyMiniApp } from '@/lib/miniAppHost'
import { getLaunchContext } from '@/lib/launchContext'
import axios from 'axios'

async function loadMasterData(): Promise<Master> {
  const masterRequest = mastersApi.getMe()
  const secondaryRequests = [
    useBookingsStore.getState().fetchBookings(),
    useHomeDataStore.getState().fetchClients(),
    useHomeDataStore.getState().fetchSubscription(),
    usePaymentsStore.getState().fetchPayments(),
    useScheduleStore.getState().fetchSchedule(),
  ]

  const master = await masterRequest
  await Promise.allSettled(secondaryRequests)
  return master
}

interface AuthState {
  token: string | null
  master: Master | null
  isLoading: boolean
  status: 'loading' | 'authenticated' | 'onboarding' | 'invalid-launch' | 'authentication-error' | 'forbidden' | 'transient-error'
  init: () => Promise<void>
  setMaster: (master: Master) => void
  refreshMaster: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(getLaunchContext().tokenKey),
  master: null,
  isLoading: true,
  status: 'loading',

  init: async () => {
    const context = getLaunchContext()
    if (context.appMode === 'invalid') {
      set({ token: null, master: null, isLoading: false, status: 'invalid-launch' })
      return
    }
    set({ isLoading: true, status: 'loading' })
    try {
      if (!context.initData) throw new Error('Mini App unavailable')

      readyMiniApp()

      const { token, isNewUser, analyticsUserId } = await authApi.login(context)
      setAnalyticsUserId(analyticsUserId)
      localStorage.setItem(context.tokenKey, token)

      const master = await loadMasterData()
      const status = context.provider === 'max' && (isNewUser || !master.isOnboarded) ? 'onboarding' : 'authenticated'
      set({ token, master, isLoading: false, status })
      trackEventOnce('auth-completed:master', 'auth_completed', { app_mode: 'master', is_new_user: isNewUser })
    } catch (error) {
      // Вне Max — используем сохранённый токен
      const code = axios.isAxiosError(error) ? error.response?.data?.code : undefined
      if (code === 'INVALID_LAUNCH') {
        localStorage.removeItem(context.tokenKey)
        set({ token: null, master: null, isLoading: false, status: 'invalid-launch' })
        return
      }
      if (code === 'INVALID_AUTHENTICATION' || code === 'INVALID_REQUEST') {
        localStorage.removeItem(context.tokenKey)
        set({ token: null, master: null, isLoading: false, status: 'authentication-error' })
        return
      }
      if (code === 'IDENTITY_UNMAPPED' || code === 'PRINCIPAL_FORBIDDEN') {
        localStorage.removeItem(context.tokenKey)
        set({ token: null, master: null, isLoading: false, status: 'forbidden' })
        return
      }
      const token = localStorage.getItem(context.tokenKey)
      if (token) {
        try {
          const master = await loadMasterData()
          set({ token, master, isLoading: false, status: 'authenticated' })
          trackEventOnce('auth-completed:master', 'auth_completed', { app_mode: 'master', is_new_user: false })
          return
        } catch {
          localStorage.removeItem(context.tokenKey)
        }
      }
      set({ token: null, master: null, isLoading: false, status: 'transient-error' })
      trackEventOnce('auth-failed:master', 'auth_failed', { app_mode: 'master', error_type: metricAuthErrorType(error) })
    }
  },

  setMaster: (master) => set({ master }),

  // Перечитать профиль мастера с сервера (услуги/фото и т.п.) и положить в стор.
  // Нужно после правок в ServicesCatalog — иначе экраны, читающие master.services
  // из стора, показывают старое до перезапуска мини-аппа.
  refreshMaster: async () => {
    try {
      const master = await mastersApi.getMe()
      set({ master })
    } catch { /* оставляем текущего master */ }
  },
}))
