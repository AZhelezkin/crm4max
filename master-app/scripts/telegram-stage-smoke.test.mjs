import { describe, expect, it, vi } from 'vitest'

import { MAX_SDK_URL, TELEGRAM_SDK_URL } from './telegram-artifact.mjs'
import { smokeTelegramStage } from './telegram-stage-smoke.mjs'

const RELEASE_ID = 'a'.repeat(64)
const TELEGRAM_HTML = `<script src="${TELEGRAM_SDK_URL}"></script><script type="module" src="/assets/telegram.js"></script><link rel="stylesheet" href="/assets/app.css">`

function response(status, body, contentType) {
  return {
    status,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    text: async () => body,
    body: { cancel: vi.fn().mockResolvedValue(undefined) },
  }
}

function successfulFetch() {
  return vi.fn(async (input, init = {}) => {
    const url = new URL(input)
    if (url.pathname === '/api/masters/me') {
      expect(init.method).toBe('PUT')
      return response(401, '{"error":"Unauthorized"}', 'application/json; charset=utf-8')
    }
    if (url.pathname === '/') return response(200, TELEGRAM_HTML, 'text/html; charset=utf-8')
    if (url.pathname.startsWith('/assets/')) return response(200, 'asset', 'application/octet-stream')
    if (url.pathname === '/__crm4max_spa_route_probe__') return response(200, '<html></html>', 'text/html')
    return response(404, '', 'text/plain')
  })
}

describe('Telegram stage smoke', () => {
  it('проверяет Telegram root, assets и backend mutation routing', async () => {
    const fetchImpl = successfulFetch()

    await expect(smokeTelegramStage({
      baseUrl: 'https://tg.stage.example',
      releaseId: RELEASE_ID,
      fetchImpl,
    })).resolves.toEqual({ routingOnly: false, releaseId: RELEASE_ID })

    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('routing preflight не требует текущий Telegram root marker', async () => {
    const fetchImpl = successfulFetch()

    await expect(smokeTelegramStage({
      baseUrl: 'https://tg.stage.example',
      releaseId: '',
      routingOnly: true,
      fetchImpl,
    })).resolves.toEqual({ routingOnly: true, releaseId: null })
  })

  it('отклоняет static 405 вместо backend 401', async () => {
    const fetchImpl = vi.fn(async () => response(405, '', 'text/html'))

    await expect(smokeTelegramStage({
      baseUrl: 'https://tg.stage.example',
      releaseId: RELEASE_ID,
      fetchImpl,
    })).rejects.toThrow('expected 401, received 405')
  })

  it('отклоняет MAX root на Telegram stage', async () => {
    const fetchImpl = successfulFetch()
    fetchImpl.mockImplementation(async (input, init = {}) => {
      const url = new URL(input)
      if (url.pathname === '/api/masters/me') return response(401, '{"error":"Unauthorized"}', 'application/json')
      if (url.pathname === '/') {
        return response(200, `<script src="${MAX_SDK_URL}"></script><script type="module" src="/assets/max.js"></script>`, 'text/html')
      }
      return response(200, 'asset', 'application/octet-stream')
    })

    await expect(smokeTelegramStage({
      baseUrl: 'https://tg.stage.example',
      releaseId: RELEASE_ID,
      fetchImpl,
    })).rejects.toThrow('telegram entrypoint must contain exactly one provider SDK')
  })
})
