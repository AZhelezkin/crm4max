import { create } from 'zustand'
import { authApi } from '@client/api/auth.api'
import { metricAuthErrorType, setAnalyticsUserId, trackEventOnce } from '@/lib/metrics'

interface AuthState {
  token: string | null
  clientId: string | null
  isLoading: boolean
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('clientToken'),
  clientId: localStorage.getItem('clientId'),
  isLoading: true,

  init: async () => {
    set({ isLoading: true })
    try {
      const initData = window.WebApp?.initData
      if (!initData) throw new Error('MAX WebApp unavailable')

      window.WebApp?.ready()

      const { token, userId, isNewUser, analyticsUserId } = await authApi.loginWithMax({ init_data: initData })
      setAnalyticsUserId(analyticsUserId)
      localStorage.setItem('clientToken', token)
      localStorage.setItem('clientId', userId)
      set({ token, clientId: userId, isLoading: false })
      trackEventOnce('auth-completed:client', 'auth_completed', { app_mode: 'client', is_new_user: isNewUser })
    } catch (error) {
      // Вне Max — используем сохранённый токен
      const token = localStorage.getItem('clientToken')
      const clientId = localStorage.getItem('clientId')
      set({ token, clientId, isLoading: false })
      if (token && clientId) {
        trackEventOnce('auth-completed:client', 'auth_completed', { app_mode: 'client', is_new_user: false })
      } else {
        trackEventOnce('auth-failed:client', 'auth_failed', { app_mode: 'client', error_type: metricAuthErrorType(error) })
      }
    }
  },
}))
