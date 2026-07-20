import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { CLIENT_TOKEN, MASTER_TOKEN } from '@/test/fixtures/auth'
import { server } from '@/test/msw/server'

async function loadApi() {
  vi.resetModules()
  return import('./client')
}

describe.sequential('client API client', () => {
  it('добавляет только client bearer token', async () => {
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

    expect(authorization).toBe(`Bearer ${CLIENT_TOKEN}`)
  })

  it('не добавляет Authorization без client token', async () => {
    localStorage.setItem('masterToken', MASTER_TOKEN)
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

  it('на 401 удаляет client token и сохраняет hash query', async () => {
    localStorage.setItem('masterToken', MASTER_TOKEN)
    localStorage.setItem('clientToken', CLIENT_TOKEN)
    window.location.hash = '#/book/services?masterId=master-1'
    server.use(
      http.get('*/api/probe', () => HttpResponse.json({ error: 'unauthorized' }, { status: 401 })),
    )
    const { api } = await loadApi()

    await expect(api.get('/probe')).rejects.toMatchObject({ response: { status: 401 } })

    expect(localStorage.getItem('clientToken')).toBeNull()
    expect(localStorage.getItem('masterToken')).toBe(MASTER_TOKEN)
    expect(window.location.hash).toBe('#/?masterId=master-1')
  })

  it('на 401 без query возвращает root hash', async () => {
    localStorage.setItem('clientToken', CLIENT_TOKEN)
    window.location.hash = '#/my-bookings'
    server.use(
      http.get('*/api/probe', () => HttpResponse.json({ error: 'unauthorized' }, { status: 401 })),
    )
    const { api } = await loadApi()

    await expect(api.get('/probe')).rejects.toMatchObject({ response: { status: 401 } })

    expect(window.location.hash).toBe('#/')
  })

  it('не меняет auth state для non-401 ошибки', async () => {
    localStorage.setItem('clientToken', CLIENT_TOKEN)
    window.location.hash = '#/my-bookings'
    server.use(
      http.get('*/api/probe', () => HttpResponse.json({ error: 'failed' }, { status: 500 })),
    )
    const { api } = await loadApi()

    await expect(api.get('/probe')).rejects.toMatchObject({ response: { status: 500 } })

    expect(localStorage.getItem('clientToken')).toBe(CLIENT_TOKEN)
    expect(window.location.hash).toBe('#/my-bookings')
  })
})
