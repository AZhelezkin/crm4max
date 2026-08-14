import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/test/msw/server'

import {
  confirmMessengerProfileLink,
  createMessengerProfileLink,
  previewMessengerProfileLink,
} from './messenger-profile-links.api'

describe('messenger profile links API', () => {
  it('создаёт ссылку без request body', async () => {
    const response = {
      destination: 'max' as const,
      url: 'https://max.ru/profile-link?startapp=pl_token',
      expiresIn: 20,
    }
    let body = 'not-read'
    server.use(http.post('*/api/profile-links', async ({ request }) => {
      body = await request.text()
      return HttpResponse.json(response)
    }))

    await expect(createMessengerProfileLink()).resolves.toEqual(response)
    expect(body).toBe('')
  })

  it.each([
    ['preview', previewMessengerProfileLink],
    ['confirm', confirmMessengerProfileLink],
  ] as const)('отправляет launch context в %s', async (action, call) => {
    let body: unknown
    server.use(http.post(`*/api/profile-links/${action}`, async ({ request }) => {
      body = await request.json()
      return HttpResponse.json(action === 'preview'
        ? { sourceProvider: 'TELEGRAM', destinationProvider: 'MAX', expiresIn: 20 }
        : { ok: true })
    }))

    await call({ provider: 'TELEGRAM', init_data: 'signed-telegram-data' })

    expect(body).toEqual({ provider: 'TELEGRAM', init_data: 'signed-telegram-data' })
  })
})
