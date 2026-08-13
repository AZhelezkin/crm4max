import { api } from './client'
import type { MiniAppLaunchContext } from '@/lib/launchContext'

type LoginResult = { token: string; userId: string; role: string; isNewUser: boolean; analyticsUserId: string | null }

export const authApi = {
  loginWithMax: (params: { init_data: string }) =>
    api.post<LoginResult>('/auth/max', {
      ...params,
      role: 'master',
      // Часовой пояс устройства мастера → бэкенд хранит его и считает по нему
      // расписание (рабочие часы/слоты «сегодня»). Безопасно при отсутствии Intl.
      timezone: deviceTimezone(),
    }).then((r) => r.data),
  login: (context: MiniAppLaunchContext) =>
    api.post<LoginResult>(context.authEndpoint, {
      init_data: context.initData,
      ...(context.provider === 'max' && context.authRole ? { role: context.authRole } : {}),
      timezone: deviceTimezone(),
    }).then((r) => r.data),
  detect: (context: MiniAppLaunchContext) =>
    api.post<LoginResult>(context.authEndpoint, { init_data: context.initData }).then((r) => r.data),
}

/** IANA-пояс устройства (напр. "Asia/Vladivostok"); undefined, если недоступно. */
function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}
