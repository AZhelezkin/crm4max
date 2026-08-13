import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { CLIENT_TOKEN, MASTER_TOKEN } from '@/test/fixtures/auth'
import { server } from '@/test/msw/server'

async function loadApi() {
  vi.resetModules()
  return import('./client')
}

describe.sequential('master API client', () => {
  it('добавляет только master bearer token', async () => {
    localStorage.setItem('masterToken', MASTER_TOKEN)
    localStorage.setItem('clientToken', CLIENT_TOKEN)
    let authorization: string | null = null
    server.use(
      http.get('*/api/probe', ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    const { api } = await loadApi()

    await api.get('/probe')

    expect(authorization).toBe(`Bearer ${MASTER_TOKEN}`)
  })

  it('не добавляет Authorization без master token', async () => {
    localStorage.setItem('clientToken', CLIENT_TOKEN)
    let authorization: string | null = 'not-read'
    server.use(
      http.get('*/api/probe', ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    const { api } = await loadApi()

    await api.get('/probe')

    expect(authorization).toBeNull()
  })

  it('на 401 удаляет только master token и применяет legacy onboarding hash', async () => {
    localStorage.setItem('masterToken', MASTER_TOKEN)
    localStorage.setItem('clientToken', CLIENT_TOKEN)
    server.use(
      http.get('*/api/probe', () => HttpResponse.json({ error: 'unauthorized' }, { status: 401 })),
    )
    const { api } = await loadApi()

    await expect(api.get('/probe')).rejects.toMatchObject({ response: { status: 401 } })

    expect(localStorage.getItem('masterToken')).toBeNull()
    expect(localStorage.getItem('clientToken')).toBe(CLIENT_TOKEN)
    expect(window.location.hash).toBe('#/onboarding')
  })

  it('не меняет auth state для non-401 ошибки', async () => {
    localStorage.setItem('masterToken', MASTER_TOKEN)
    window.location.hash = '#/bookings'
    server.use(
      http.get('*/api/probe', () => HttpResponse.json({ error: 'failed' }, { status: 500 })),
    )
    const { api } = await loadApi()

    await expect(api.get('/probe')).rejects.toMatchObject({ response: { status: 500 } })

    expect(localStorage.getItem('masterToken')).toBe(MASTER_TOKEN)
    expect(window.location.hash).toBe('#/bookings')
  })

  it('на Telegram 401 очищает только Telegram token без MAX onboarding redirect', async () => {
    window.__MINI_APP_PROVIDER__ = 'telegram'
    window.Telegram = { WebApp: { initData: 'telegram-init-data', initDataUnsafe: { start_param: 'mmode' } } }
    localStorage.setItem('telegramMasterToken', MASTER_TOKEN)
    localStorage.setItem('masterToken', 'max-master-token')
    window.location.hash = '#/bookings'
    server.use(
      http.get('*/api/probe', () => HttpResponse.json({ error: 'unauthorized' }, { status: 401 })),
    )
    const { api } = await loadApi()

    await expect(api.get('/probe')).rejects.toMatchObject({ response: { status: 401 } })

    expect(localStorage.getItem('telegramMasterToken')).toBeNull()
    expect(localStorage.getItem('masterToken')).toBe('max-master-token')
    expect(window.location.hash).toBe('#/bookings')
  })
})
