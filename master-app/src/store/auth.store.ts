import { create } from 'zustand'
import bridge from '@vkontakte/vk-bridge'
import { authApi } from '@/api/auth.api'
import { mastersApi } from '@/api/masters.api'
import type { Master } from '@/types'

interface AuthState {
  token: string | null
  master: Master | null
  isLoading: boolean
  init: () => Promise<void>
  setMaster: (master: Master) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  master: null,
  isLoading: true,

  init: async () => {
    set({ isLoading: true })
    try {
      const result = await bridge.send('VKWebAppGetAuthToken', {
        app_id: Number(import.meta.env.VITE_VK_APP_ID),
        scope: '',
      })

      const { token } = await authApi.loginWithMax({
        init_data: result.access_token as string,
      })

      localStorage.setItem('token', token)

      const master = await mastersApi.getMe()
      set({ token, master, isLoading: false })
    } catch {
      // Вне Max — используем сохранённый токен
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const master = await mastersApi.getMe()
          set({ token, master, isLoading: false })
          return
        } catch {
          localStorage.removeItem('token')
        }
      }
      set({ isLoading: false })
    }
  },

  setMaster: (master) => set({ master }),
}))
