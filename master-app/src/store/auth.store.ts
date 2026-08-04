import { create } from 'zustand'
import { authApi } from '@/api/auth.api'
import { mastersApi } from '@/api/masters.api'
import type { Master } from '@/types'
import { metricAuthErrorType, trackEventOnce } from '@/lib/metrics'

interface AuthState {
  token: string | null
  master: Master | null
  isLoading: boolean
  init: () => Promise<void>
  setMaster: (master: Master) => void
  refreshMaster: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('masterToken'),
  master: null,
  isLoading: true,

  init: async () => {
    set({ isLoading: true })
    try {
      const initData = window.WebApp?.initData
      if (!initData) throw new Error('MAX WebApp unavailable')

      window.WebApp?.ready()

      const { token, isNewUser } = await authApi.loginWithMax({ init_data: initData })
      localStorage.setItem('masterToken', token)

      const master = await mastersApi.getMe()
      set({ token, master, isLoading: false })
      trackEventOnce('auth-completed:master', 'auth_completed', { app_mode: 'master', is_new_user: isNewUser })
    } catch (error) {
      // Вне Max — используем сохранённый токен
      const token = localStorage.getItem('masterToken')
      if (token) {
        try {
          const master = await mastersApi.getMe()
          set({ token, master, isLoading: false })
          trackEventOnce('auth-completed:master', 'auth_completed', { app_mode: 'master', is_new_user: false })
          return
        } catch {
          localStorage.removeItem('masterToken')
        }
      }
      set({ isLoading: false })
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
