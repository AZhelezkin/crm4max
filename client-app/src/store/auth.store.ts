import { create } from 'zustand'
import { authApi } from '@/api/auth.api'

interface AuthState {
  token: string | null
  clientId: string | null
  isLoading: boolean
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  clientId: localStorage.getItem('clientId'),
  isLoading: true,

  init: async () => {
    set({ isLoading: true })
    try {
      const initData = window.WebApp?.initData
      if (!initData) throw new Error('MAX WebApp unavailable')

      window.WebApp?.ready()

      const { token, userId } = await authApi.loginWithMax({ init_data: initData })
      localStorage.setItem('token', token)
      localStorage.setItem('clientId', userId)
      set({ token, clientId: userId, isLoading: false })
    } catch {
      const token = localStorage.getItem('token')
      const clientId = localStorage.getItem('clientId')
      set({ token, clientId, isLoading: false })
    }
  },
}))
