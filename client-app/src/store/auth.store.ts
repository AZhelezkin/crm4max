import { create } from 'zustand'
import bridge from '@vkontakte/vk-bridge'
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
      const { access_token, user_id } = await bridge.send('VKWebAppGetAuthToken', {
        app_id: Number(import.meta.env.VITE_VK_APP_ID),
        scope: '',
      })

      const { token, userId } = await authApi.loginWithVk({
        vk_access_token: access_token,
        vk_user_id: String(user_id),
      })

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
