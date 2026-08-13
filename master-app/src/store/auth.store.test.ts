import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ANALYTICS_USER_ID, MASTER_TOKEN } from '@/test/fixtures/auth'
import { createMasterProfile } from '@/test/fixtures/masters'
import { server } from '@/test/msw/server'
import { installWebApp, removeWebApp } from '@/test/web-app-fixture'

async function loadStore() {
  vi.resetModules()
  return import('./auth.store')
}

function handleHomePrefetch() {
  server.use(
    http.get('*/api/bookings', () => HttpResponse.json([])),
    http.get('*/api/clients', () => HttpResponse.json([])),
    http.get('*/api/subscription/me', () => HttpResponse.json(null)),
    http.get('*/api/payments', () => HttpResponse.json([])),
    http.get('*/api/schedule/me', () => HttpResponse.json(null)),
  )
}

afterEach(() => {
  delete window.ym
})

describe.sequential('master auth store', () => {
  it('авторизуется через MAX, сохраняет token и загружает профиль', async () => {
    handleHomePrefetch()
    const webApp = installWebApp({ initData: 'master-init-data' })
    const master = createMasterProfile()
    const ym = vi.fn()
    vi.stubEnv('VITE_YANDEX_METRICA_ID', '111073756')
    window.ym = ym
    server.use(
      http.post('*/api/auth/max', () => HttpResponse.json({
         token: MASTER_TOKEN,
         userId: master.id,
         role: 'master',
         isNewUser: true,
         analyticsUserId: ANALYTICS_USER_ID,
      })),
      http.get('*/api/masters/me', () => HttpResponse.json(master)),
    )
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(webApp.ready).toHaveBeenCalledOnce()
    expect(ym).toHaveBeenCalledWith(111073756, 'setUserID', ANALYTICS_USER_ID)
    expect(localStorage.getItem('masterToken')).toBe(MASTER_TOKEN)
    expect(useAuthStore.getState()).toMatchObject({
      token: MASTER_TOKEN,
      master,
      isLoading: false,
    })
    const { useBookingsStore } = await import('./bookings.store')
    const { useHomeDataStore } = await import('./home-data.store')
    const { usePaymentsStore } = await import('./payments.store')
    const { useScheduleStore } = await import('./schedule.store')
    expect(useBookingsStore.getState().loaded).toBe(true)
    expect(useHomeDataStore.getState()).toMatchObject({ clientsLoaded: true, subscriptionLoaded: true })
    expect(usePaymentsStore.getState().loaded).toBe(true)
    expect(useScheduleStore.getState().loaded).toBe(true)
  })

  it('авторизуется через Telegram и изолирует token от MAX', async () => {
    handleHomePrefetch()
    const ready = vi.fn()
    const expand = vi.fn()
    const master = createMasterProfile()
    window.__MINI_APP_PROVIDER__ = 'telegram'
    window.__TELEGRAM_INIT_DATA__ = 'signed-telegram-init-data'
    window.Telegram = { WebApp: { ready, expand, initDataUnsafe: { start_param: 'mmode' } } }
    let authBody: Record<string, string> | null = null
    server.use(
      http.post('*/api/auth/telegram', async ({ request }) => {
        authBody = await request.json() as Record<string, string>
        return HttpResponse.json({
          token: MASTER_TOKEN,
          userId: master.id,
          role: 'master',
          isNewUser: false,
          analyticsUserId: ANALYTICS_USER_ID,
        })
      }),
      http.get('*/api/masters/me', () => HttpResponse.json(master)),
    )
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(authBody).toMatchObject({ init_data: 'signed-telegram-init-data' })
    expect(authBody).not.toHaveProperty('role')
    expect(ready).toHaveBeenCalledOnce()
    expect(expand).toHaveBeenCalledOnce()
    expect(localStorage.getItem('telegramMasterToken')).toBe(MASTER_TOKEN)
    expect(localStorage.getItem('masterToken')).toBeNull()
    expect(useAuthStore.getState()).toMatchObject({ token: MASTER_TOKEN, master, isLoading: false })
  })

  it('не использует MAX token и не включает onboarding при forbidden Telegram identity', async () => {
    window.__MINI_APP_PROVIDER__ = 'telegram'
    window.__TELEGRAM_INIT_DATA__ = 'signed-telegram-init-data'
    window.Telegram = { WebApp: { initDataUnsafe: { start_param: 'mmode' } } }
    localStorage.setItem('masterToken', 'max-token')
    server.use(http.post('*/api/auth/telegram', () => HttpResponse.json(
      { error: 'Forbidden', code: 'IDENTITY_UNMAPPED' },
      { status: 403 },
    )))
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(useAuthStore.getState()).toMatchObject({ token: null, master: null, status: 'forbidden', isLoading: false })
    expect(localStorage.getItem('masterToken')).toBe('max-token')
    expect(localStorage.getItem('telegramMasterToken')).toBeNull()
  })

  it('не подхватывает stale Telegram token после authoritative auth failure', async () => {
    window.__MINI_APP_PROVIDER__ = 'telegram'
    window.__TELEGRAM_INIT_DATA__ = 'invalid-telegram-init-data'
    window.Telegram = { WebApp: { initDataUnsafe: { start_param: 'mmode' } } }
    localStorage.setItem('telegramMasterToken', 'stale-telegram-token')
    server.use(http.post('*/api/auth/telegram', () => HttpResponse.json(
      { error: 'Invalid Telegram authentication', code: 'INVALID_AUTHENTICATION' },
      { status: 401 },
    )))
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(useAuthStore.getState()).toMatchObject({ token: null, master: null, status: 'authentication-error', isLoading: false })
    expect(localStorage.getItem('telegramMasterToken')).toBeNull()
  })

  it('использует сохранённый master token вне MAX', async () => {
    handleHomePrefetch()
    removeWebApp()
    localStorage.setItem('masterToken', MASTER_TOKEN)
    const master = createMasterProfile()
    let authorization: string | null = null
    const authRequest = vi.fn()
    server.use(
      http.post('*/api/auth/max', () => {
        authRequest()
        return HttpResponse.json({ token: 'unexpected' })
      }),
      http.get('*/api/masters/me', ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json(master)
      }),
    )
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(authRequest).not.toHaveBeenCalled()
    expect(authorization).toBe(`Bearer ${MASTER_TOKEN}`)
    expect(useAuthStore.getState()).toMatchObject({ master, isLoading: false })
  })

  it('не блокирует авторизацию при ошибке вторичной загрузки', async () => {
    handleHomePrefetch()
    const master = createMasterProfile({ isOnboarded: false })
    installWebApp({ initData: 'master-init-data' })
    server.use(
      http.post('*/api/auth/max', () => HttpResponse.json({
        token: MASTER_TOKEN,
        userId: master.id,
        role: 'master',
        isNewUser: true,
        analyticsUserId: ANALYTICS_USER_ID,
      })),
      http.get('*/api/masters/me', () => HttpResponse.json(master)),
      http.get('*/api/subscription/me', () => HttpResponse.json({ error: 'unavailable' }, { status: 500 })),
    )
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(localStorage.getItem('masterToken')).toBe(MASTER_TOKEN)
    expect(useAuthStore.getState()).toMatchObject({ token: MASTER_TOKEN, master, isLoading: false })
  })

  it('удаляет невалидный сохранённый token', async () => {
    handleHomePrefetch()
    removeWebApp()
    localStorage.setItem('masterToken', MASTER_TOKEN)
    server.use(
      http.get('*/api/masters/me', () => HttpResponse.json({ error: 'unauthorized' }, { status: 401 })),
    )
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(localStorage.getItem('masterToken')).toBeNull()
    expect(useAuthStore.getState()).toMatchObject({
      master: null,
      isLoading: false,
    })
  })

  it('завершает loading без MAX и сохранённого token', async () => {
    removeWebApp()
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      master: null,
      isLoading: false,
    })
  })

  it('обновляет профиль через setMaster', async () => {
    const { useAuthStore } = await loadStore()
    const master = createMasterProfile({ name: 'Новое имя' })

    useAuthStore.getState().setMaster(master)

    expect(useAuthStore.getState().master).toEqual(master)
  })

  it('перечитывает authoritative профиль', async () => {
    const master = createMasterProfile({ name: 'Профиль с сервера' })
    server.use(http.get('*/api/masters/me', () => HttpResponse.json(master)))
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().refreshMaster()

    expect(useAuthStore.getState().master).toEqual(master)
  })

  it('сохраняет текущий профиль при ошибке refresh', async () => {
    const current = createMasterProfile({ name: 'Текущее имя' })
    server.use(
      http.get('*/api/masters/me', () => HttpResponse.json({ error: 'failed' }, { status: 500 })),
    )
    const { useAuthStore } = await loadStore()
    useAuthStore.setState({ master: current })

    await useAuthStore.getState().refreshMaster()

    expect(useAuthStore.getState().master).toEqual(current)
  })
})
