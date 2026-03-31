import { api } from './client'

export const authApi = {
  loginWithMax: (params: { init_data: string }) =>
    api.post<{ token: string; userId: string; role: string }>('/auth/max', {
      ...params,
      role: 'client',
    }).then((r) => r.data),
}
