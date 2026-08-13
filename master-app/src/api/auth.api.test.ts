import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { ANALYTICS_USER_ID, MASTER_ID, MASTER_TOKEN } from '@/test/fixtures/auth'
import { server } from '@/test/msw/server'
import { mockDeviceTimezone } from '@/test/time'
import type { MiniAppLaunchContext } from '@/lib/launchContext'

describe.sequential('master auth API', () => {
  it('отправляет init_data, master role и device timezone', async () => {
    mockDeviceTimezone('Asia/Vladivostok')
    let body: Record<string, string> | null = null
    server.use(
      http.post('*/api/auth/max', async ({ request }) => {
        body = await request.json() as Record<string, string>
        return HttpResponse.json({ token: MASTER_TOKEN, userId: MASTER_ID, role: 'master', isNewUser: true, analyticsUserId: ANALYTICS_USER_ID })
      }),
    )
    vi.resetModules()
    const { authApi } = await import('./auth.api')

    const result = await authApi.loginWithMax({ init_data: 'master-init-data' })

    expect(body).toEqual({
      init_data: 'master-init-data',
      role: 'master',
      timezone: 'Asia/Vladivostok',
    })
    expect(result).toEqual({ token: MASTER_TOKEN, userId: MASTER_ID, role: 'master', isNewUser: true, analyticsUserId: ANALYTICS_USER_ID })
  })

  it('не придумывает timezone при ошибке Intl', async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => {
      throw new Error('timezone unavailable')
    })
    let body: Record<string, string> | null = null
    server.use(
      http.post('*/api/auth/max', async ({ request }) => {
        body = await request.json() as Record<string, string>
        return HttpResponse.json({ token: MASTER_TOKEN, userId: MASTER_ID, role: 'master' })
      }),
    )
    vi.resetModules()
    const { authApi } = await import('./auth.api')

    await authApi.loginWithMax({ init_data: 'master-init-data' })

    expect(body).toEqual({
      init_data: 'master-init-data',
      role: 'master',
    })
  })

  it('отправляет Telegram init data в отдельный endpoint без MAX role', async () => {
    window.__MINI_APP_PROVIDER__ = 'telegram'
    let body: Record<string, string> | null = null
    server.use(
      http.post('*/api/auth/telegram', async ({ request }) => {
        body = await request.json() as Record<string, string>
        return HttpResponse.json({ token: MASTER_TOKEN, userId: MASTER_ID, role: 'master' })
      }),
    )
    vi.resetModules()
    const { authApi } = await import('./auth.api')

    await authApi.login({
      provider: 'telegram', appMode: 'master', startParam: 'mmode', startParamSource: 'telegram-sdk',
      initData: 'telegram-init-data', authEndpoint: '/auth/telegram', authRole: null,
      tokenKey: 'telegramMasterToken',
    } satisfies MiniAppLaunchContext)

    expect(body).toMatchObject({ init_data: 'telegram-init-data' })
    expect(body).not.toHaveProperty('role')
    delete window.__MINI_APP_PROVIDER__
  })
})
