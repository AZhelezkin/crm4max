import { api } from './client'

export const authApi = {
  loginWithVk: (params: { vk_access_token: string; vk_user_id: string }) =>
    api.post<{ token: string; userId: string; role: string }>('/auth/vk', {
      ...params,
      role: 'client',
    }).then((r) => r.data),
}
