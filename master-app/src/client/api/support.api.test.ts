import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/test/msw/server'

import { startSupport } from './support.api'

describe('client support API', () => {
  it('запускает поддержку и возвращает bot URL', async () => {
    const response = { ok: true as const, botUrl: 'https://max.ru/client-support-bot' }
    server.use(http.post('*/api/support/start', () => HttpResponse.json(response)))

    await expect(startSupport()).resolves.toEqual(response)
  })

  it('пробрасывает ошибку backend', async () => {
    server.use(
      http.post('*/api/support/start', () => HttpResponse.json({ error: 'failed' }, { status: 503 })),
    )

    await expect(startSupport()).rejects.toMatchObject({ response: { status: 503 } })
  })
})
