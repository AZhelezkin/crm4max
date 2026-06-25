import { api } from './client'

export const authApi = {
  loginWithMax: (params: { init_data: string }) =>
    api.post<{ token: string; userId: string; role: string }>('/auth/max', {
      ...params,
      role: 'master',
      // Часовой пояс устройства мастера → бэкенд хранит его и считает по нему
      // расписание (рабочие часы/слоты «сегодня»). Безопасно при отсутствии Intl.
      timezone: deviceTimezone(),
    }).then((r) => r.data),
}

/** IANA-пояс устройства (напр. "Asia/Vladivostok"); undefined, если недоступно. */
function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}
