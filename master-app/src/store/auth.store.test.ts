import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { MASTER_TOKEN } from '@/test/fixtures/auth'
import { createMasterProfile } from '@/test/fixtures/masters'
import { server } from '@/test/msw/server'
import { installWebApp, removeWebApp } from '@/test/web-app-fixture'

async function loadStore() {
  vi.resetModules()
  return import('./auth.store')
}

describe.sequential('master auth store', () => {
  it('авторизуется через MAX, сохраняет token и загружает профиль', async () => {
    const webApp = installWebApp({ initData: 'master-init-data' })
    const master = createMasterProfile()
    server.use(
      http.post('*/api/auth/max', () => HttpResponse.json({
         token: MASTER_TOKEN,
         userId: master.id,
         role: 'master',
         isNewUser: true,
      })),
      http.get('*/api/masters/me', () => HttpResponse.json(master)),
    )
    const { useAuthStore } = await loadStore()

    await useAuthStore.getState().init()

    expect(webApp.ready).toHaveBeenCalledOnce()
    expect(localStorage.getItem('masterToken')).toBe(MASTER_TOKEN)
    expect(useAuthStore.getState()).toMatchObject({
      token: MASTER_TOKEN,
      master,
      isLoading: false,
    })
  })

  it('использует сохранённый master token вне MAX', async () => {
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

  it('удаляет невалидный сохранённый token', async () => {
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
