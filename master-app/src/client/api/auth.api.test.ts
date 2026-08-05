import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { ANALYTICS_USER_ID, CLIENT_ID, CLIENT_TOKEN } from '@/test/fixtures/auth'
import { server } from '@/test/msw/server'
import { mockDeviceTimezone } from '@/test/time'

describe.sequential('client auth API', () => {
  it('отправляет init_data, client role и device timezone', async () => {
    mockDeviceTimezone('Europe/Kaliningrad')
    let body: Record<string, string> | null = null
    server.use(
      http.post('*/api/auth/max', async ({ request }) => {
        body = await request.json() as Record<string, string>
        return HttpResponse.json({ token: CLIENT_TOKEN, userId: CLIENT_ID, role: 'client', isNewUser: true, analyticsUserId: ANALYTICS_USER_ID })
      }),
    )
    vi.resetModules()
    const { authApi } = await import('./auth.api')

    const result = await authApi.loginWithMax({ init_data: 'client-init-data' })

    expect(body).toEqual({
      init_data: 'client-init-data',
      role: 'client',
      timezone: 'Europe/Kaliningrad',
    })
    expect(result).toEqual({ token: CLIENT_TOKEN, userId: CLIENT_ID, role: 'client', isNewUser: true, analyticsUserId: ANALYTICS_USER_ID })
  })

  it('не читает master token для auth request', async () => {
    localStorage.setItem('masterToken', 'master-only-token')
    let authorization: string | null = 'not-read'
    server.use(
      http.post('*/api/auth/max', ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json({ token: CLIENT_TOKEN, userId: CLIENT_ID, role: 'client' })
      }),
    )
    vi.resetModules()
    const { authApi } = await import('./auth.api')

    await authApi.loginWithMax({ init_data: 'client-init-data' })

    expect(authorization).toBeNull()
  })
})
