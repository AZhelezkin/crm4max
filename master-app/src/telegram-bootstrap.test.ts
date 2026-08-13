import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./telegram-render', () => ({}))

describe('Telegram bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    delete window.__MINI_APP_PROVIDER__
    delete window.__TELEGRAM_INIT_DATA__
    delete window.Telegram
    window.history.replaceState(null, '', '/')
  })

  it('сохраняет tgWebAppData из Telegram Desktop fragment до запуска HashRouter', async () => {
    const ready = vi.fn()
    const expand = vi.fn()
    window.Telegram = { WebApp: { initData: '', ready, expand } }
    window.history.replaceState(
      null,
      '',
      '/?v=4#tgWebAppData=query_id%3Ddesktop%26auth_date%3D123&tgWebAppVersion=9.0&tgWebAppPlatform=tdesktop',
    )

    await import('./telegram-bootstrap')

    expect(window.__MINI_APP_PROVIDER__).toBe('telegram')
    expect(window.__TELEGRAM_INIT_DATA__).toBe('query_id=desktop&auth_date=123')
    expect(ready).toHaveBeenCalledOnce()
    expect(expand).toHaveBeenCalledOnce()
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/?v=4#/')
  })

  it('сохраняет SDK start_param с приоритетом над fragment до render', async () => {
    window.Telegram = { WebApp: { initData: 'sdk-data', initDataUnsafe: { start_param: 'mmode' } } }
    window.history.replaceState(null, '', '/?startapp=client#tgWebAppStartParam=unknown&route=kept')

    await import('./telegram-bootstrap')
    const { getLaunchContext } = await import('@/lib/launchContext')

    expect(getLaunchContext()).toMatchObject({ provider: 'telegram', appMode: 'master', startParam: 'mmode', startParamSource: 'telegram-sdk' })
    expect(window.location.search).toBe('?startapp=client')
    expect(window.location.hash).toBe('#route=kept')
  })
})
