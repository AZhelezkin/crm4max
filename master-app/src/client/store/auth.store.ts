import { create } from 'zustand'
import { authApi } from '@client/api/auth.api'

interface AuthState {
  token: string | null
  clientId: string | null
  isLoading: boolean
  metricsConsent: boolean
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('clientToken'),
  clientId: localStorage.getItem('clientId'),
  isLoading: true,
  metricsConsent: false,

  init: async () => {
    set({ isLoading: true })
    try {
      const initData = window.WebApp?.initData
      if (!initData) throw new Error('MAX WebApp unavailable')

      window.WebApp?.ready()

      const { token, userId } = await authApi.loginWithMax({ init_data: initData })
      localStorage.setItem('clientToken', token)
      localStorage.setItem('clientId', userId)
      set({ token, clientId: userId, isLoading: false, metricsConsent: true })
    } catch {
      // Вне Max — используем сохранённый токен
      const token = localStorage.getItem('clientToken')
      const clientId = localStorage.getItem('clientId')
      set({ token, clientId, isLoading: false, metricsConsent: false })
    }
  },
}))
