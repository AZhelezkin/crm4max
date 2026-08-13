import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const PROJECT_ROOT = resolve(process.cwd())
const MAX_SDK = 'https://st.max.ru/js/max-web-app.js'
const TELEGRAM_SDK = 'https://telegram.org/js/telegram-web-app.js'

function source(name: string) {
  return readFileSync(resolve(PROJECT_ROOT, name), 'utf8')
}

describe('dual Mini App entrypoint architecture', () => {
  it('изолирует MAX SDK и bootstrap в основном entrypoint', () => {
    const html = source('index.html')

    expect(html.match(new RegExp(MAX_SDK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1)
    expect(html).not.toContain(TELEGRAM_SDK)
    expect(html).toContain('src="/src/main.tsx"')
    expect(html).not.toContain('telegram-bootstrap')
  })

  it('изолирует Telegram SDK и bootstrap в Telegram entrypoint', () => {
    const html = source('telegram.html')

    expect(html.match(new RegExp(TELEGRAM_SDK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1)
    expect(html).not.toContain(MAX_SDK)
    expect(html).toContain('src="/src/telegram-bootstrap.ts"')
    expect(html).not.toContain('src="/src/main.tsx"')
  })

  it('собирает оба HTML как явные Vite inputs', () => {
    const config = source('vite.config.ts')

    expect(config).toMatch(/main:\s*resolve\(__dirname, 'index\.html'\)/)
    expect(config).toMatch(/telegram:\s*resolve\(__dirname, 'telegram\.html'\)/)
    expect(config.match(/resolve\(__dirname, '(?:index|telegram)\.html'\)/g)).toHaveLength(2)
  })

  it('фиксирует exclusive API/static handlers в Telegram stage Caddy contract', () => {
    const caddy = source('../infra/telegram-stage/Caddyfile')
    const apiHandle = caddy.indexOf('handle /api/*')
    const staticHandle = caddy.indexOf('\n\thandle {')

    expect(apiHandle).toBeGreaterThan(-1)
    expect(staticHandle).toBeGreaterThan(apiHandle)
    expect(caddy).toContain('reverse_proxy 127.0.0.1:18082')
    expect(caddy).toContain('try_files {path} /index.html')
  })
})
