import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ANALYTICS_USER_ID, CLIENT_ID, CLIENT_TOKEN, MASTER_TOKEN } from '@/test/fixtures/auth'
import { server } from '@/test/msw/server'
import { installWebApp, removeWebApp } from '@/test/web-app-fixture'

async function loadStore() {
  vi.resetModules()
  return import('./auth.store')
}

afterEach(() => {
  delete window.ym
})

describe.sequential('client auth store', () => {
  it('авторизуется через MAX и сохраняет client credentials', async () => {
    const webApp = installWebApp({ initData: 'client-init-data' })
    const ym = vi.fn()
    vi.stubEnv('VITE_YANDEX_METRICA_ID', '111073756')
    window.ym = ym
    server.use(
      http.post('*/api/auth/max', () => HttpResponse.json({
         token: CLIENT_TOKEN,
         userId: CLIENT_ID,
         role: 'client',
         isNewUser: true,
         analyticsUserId: ANALYTICS_USER_ID,
      })),
    )
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(webApp.ready).toHaveBeenCalledOnce()
    expect(ym).toHaveBeenCalledWith(111073756, 'setUserID', ANALYTICS_USER_ID)
    expect(localStorage.getItem('clientToken')).toBe(CLIENT_TOKEN)
    expect(localStorage.getItem('clientId')).toBe(CLIENT_ID)
    expect(useAuthStore.getState()).toMatchObject({
      token: CLIENT_TOKEN,
      clientId: CLIENT_ID,
      isLoading: false,
    })
  })

  it('восстанавливает сохранённые client credentials вне MAX', async () => {
    removeWebApp()
    localStorage.setItem('clientToken', CLIENT_TOKEN)
    localStorage.setItem('clientId', CLIENT_ID)
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(useAuthStore.getState()).toMatchObject({
      token: CLIENT_TOKEN,
      clientId: CLIENT_ID,
      isLoading: false,
    })
  })

  it('возвращается к сохранённым credentials при ошибке MAX auth', async () => {
    installWebApp({ initData: 'invalid-init-data' })
    localStorage.setItem('clientToken', CLIENT_TOKEN)
    localStorage.setItem('clientId', CLIENT_ID)
    server.use(
      http.post('*/api/auth/max', () => HttpResponse.json({ error: 'invalid' }, { status: 500 })),
    )
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(useAuthStore.getState()).toMatchObject({
      token: CLIENT_TOKEN,
      clientId: CLIENT_ID,
      isLoading: false,
    })
  })

  it('не принимает master token как client fallback', async () => {
    removeWebApp()
    localStorage.setItem('masterToken', MASTER_TOKEN)
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      clientId: null,
      isLoading: false,
    })
  })
})
