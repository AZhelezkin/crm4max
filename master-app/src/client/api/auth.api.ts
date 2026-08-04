import { api } from './client'

export const authApi = {
  loginWithMax: (params: { init_data: string }) =>
    api.post<{ token: string; userId: string; role: string; isNewUser: boolean }>('/auth/max', {
      ...params,
      role: 'client',
      // Пояс устройства клиента → бэкенд хранит его и показывает время записей/слотов
      // в поясе клиента. Безопасно при отсутствии Intl.
      timezone: deviceTimezone(),
    }).then((r) => r.data),
}

/** IANA-пояс устройства (напр. "Europe/Moscow"); undefined, если недоступно. */
function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}
