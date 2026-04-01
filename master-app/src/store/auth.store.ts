import { create } from 'zustand'
import { authApi } from '@/api/auth.api'
import { mastersApi } from '@/api/masters.api'
import type { Master } from '@/types'

interface AuthState {
  token: string | null
  master: Master | null
  isLoading: boolean
  nameHint: string        // имя пользователя из Max (подсказка для онбординга)
  init: () => Promise<void>
  setMaster: (master: Master) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  master: null,
  isLoading: true,
  nameHint: '',

  init: async () => {
    set({ isLoading: true })
    try {
      const initData = window.WebApp?.initData
      if (!initData) throw new Error('MAX WebApp unavailable')

      window.WebApp?.ready()

      // Извлекаем имя из Max initData как подсказку для онбординга
      // Max: поле name (в некоторых контекстах — first_name + last_name)
      try {
        const params = new URLSearchParams(initData)
        const user = params.get('user') ? JSON.parse(params.get('user')!) : null
        const hint = user?.name ||
          [user?.first_name, user?.last_name].filter(Boolean).join(' ')
        if (hint) set({ nameHint: hint })
      } catch {
        // не критично — просто не будет подсказки
      }

      const { token } = await authApi.loginWithMax({ init_data: initData })
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
