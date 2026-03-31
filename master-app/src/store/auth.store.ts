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
      // Получаем токен от VK Bridge
      const result = await bridge.send('VKWebAppGetAuthToken', {
        app_id: Number(import.meta.env.VITE_VK_APP_ID),
        scope: '',
      })

      const { token } = await authApi.loginWithVk({
        vk_access_token: result.access_token as string,
        vk_user_id: String(result.user_id),
      })

      localStorage.setItem('token', token)

      const master = await mastersApi.getMe()
      set({ token, master, isLoading: false })
    } catch {
      // В dev-режиме без VK Bridge работаем с сохранённым токеном
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
