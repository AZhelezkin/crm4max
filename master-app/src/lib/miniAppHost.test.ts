import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installWebApp } from '@/test/web-app-fixture'

import {
  bindMiniAppNativeBack,
  downloadMiniAppFile,
  masterTokenKey,
  miniAppHost,
  miniAppInitData,
  miniAppProvider,
  openMiniAppLink,
  openMiniAppMessengerLink,
  readMasterToken,
  readyMiniApp,
  removeMasterToken,
  writeMasterToken,
} from './miniAppHost'

describe('miniAppHost', () => {
  beforeEach(() => {
    localStorage.clear()
    delete window.__MINI_APP_PROVIDER__
    delete window.Telegram
    delete window.WebApp
  })

  it('сохраняет прежний MAX-контракт по умолчанию', () => {
    expect(miniAppProvider()).toBe('max')
    expect(masterTokenKey()).toBe('masterToken')
  })

  it('использует Telegram init data, ready, expand и отдельный token key', () => {
    const ready = vi.fn()
    const expand = vi.fn()
    window.__MINI_APP_PROVIDER__ = 'telegram'
    window.Telegram = { WebApp: { initData: 'telegram-init-data', ready, expand } }

    expect(miniAppInitData()).toBe('telegram-init-data')
    readyMiniApp()
    writeMasterToken('telegram-token')

    expect(ready).toHaveBeenCalledOnce()
    expect(expand).toHaveBeenCalledOnce()
    expect(readMasterToken()).toBe('telegram-token')
    expect(localStorage.getItem('masterToken')).toBeNull()
    removeMasterToken()
    expect(readMasterToken()).toBeNull()
  })

  it('вызывает Telegram lifecycle только один раз', () => {
    const ready = vi.fn()
    const expand = vi.fn()
    window.__MINI_APP_PROVIDER__ = 'telegram'
    window.Telegram = { WebApp: { ready, expand } }

    expect(readyMiniApp()).toEqual({ status: 'completed', value: undefined })
    expect(readyMiniApp()).toEqual({ status: 'completed', value: undefined })
    expect(ready).toHaveBeenCalledOnce()
    expect(expand).toHaveBeenCalledOnce()
  })

  it('сохраняет MAX lifecycle и link API', async () => {
    const ready = vi.fn()
    const openLink = vi.fn()
    const close = vi.fn()
    window.WebApp = {
      ready,
      openLink,
      close,
      initData: 'max-init-data',
      initDataUnsafe: {},
    } as unknown as Window['WebApp']
    const { closeMiniApp, openMiniAppLink, readyMiniApp } = await import('./miniAppHost')

    readyMiniApp()
    openMiniAppLink('https://example.test/max')

    expect(ready).toHaveBeenCalledOnce()
    expect(openLink).toHaveBeenCalledWith('https://example.test/max')
    expect(closeMiniApp()).toBe(true)
    expect(close).toHaveBeenCalledOnce()
  })

  it('открывает MAX messenger URL через openMaxLink с fallback на openLink', () => {
    const webApp = installWebApp()

    expect(openMiniAppMessengerLink('https://max.ru/support')).toEqual({ status: 'completed', value: undefined })
    expect(webApp.openMaxLink).toHaveBeenCalledWith('https://max.ru/support')
    expect(webApp.openLink).not.toHaveBeenCalled()

    window.WebApp = { ...webApp, openMaxLink: undefined } as unknown as Window['WebApp']
    expect(openMiniAppMessengerLink('https://max.ru/support')).toEqual({ status: 'completed', value: undefined })
    expect(webApp.openLink).toHaveBeenCalledWith('https://max.ru/support')
  })

  it('делегирует lifecycle и link API в Telegram без вызовов MAX', async () => {
    const openLink = vi.fn()
    const close = vi.fn()
    const disableVerticalSwipes = vi.fn()
    window.__MINI_APP_PROVIDER__ = 'telegram'
    window.Telegram = { WebApp: { openLink, close, disableVerticalSwipes } }
    const { closeMiniApp, openMiniAppLink, setMiniAppVerticalSwipes } = await import('./miniAppHost')

    openMiniAppLink('https://example.test/telegram')

    expect(openLink).toHaveBeenCalledWith('https://example.test/telegram')
    expect(closeMiniApp()).toBe(true)
    await expect(setMiniAppVerticalSwipes(false)).resolves.toEqual({ status: 'completed', value: false })
    expect(disableVerticalSwipes).toHaveBeenCalledOnce()
  })

  it('возвращает failed для ошибки доступного SDK method', () => {
    const error = new Error('close failed')
    window.WebApp = { close: vi.fn(() => { throw error }) } as unknown as Window['WebApp']

    expect(miniAppHost().close()).toEqual({ status: 'failed', error })
  })

  it('явно описывает browser fallback и unsupported capabilities', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)

    expect(miniAppHost().provider).toBe('browser')
    expect(miniAppHost().capabilities).toMatchObject({ externalLinks: true, close: false, download: false })
    expect(openMiniAppLink('https://example.test/browser')).toEqual({ status: 'completed', value: undefined })
    expect(downloadMiniAppFile('https://example.test/file', 'file.xlsx')).toEqual({ status: 'completed', value: undefined })
    await expect(miniAppHost().setVerticalSwipes(false)).resolves.toEqual({ status: 'unsupported' })
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('синхронизирует Telegram BackButton и очищает callback', () => {
    const show = vi.fn()
    const hide = vi.fn()
    const onClick = vi.fn()
    const offClick = vi.fn()
    const onBack = vi.fn()
    window.__MINI_APP_PROVIDER__ = 'telegram'
    window.Telegram = { WebApp: { BackButton: { show, hide, onClick, offClick } } }

    const outcome = bindMiniAppNativeBack({ visible: true, onBack })

    expect(outcome.status).toBe('completed')
    expect(onClick).toHaveBeenCalledWith(onBack)
    expect(show).toHaveBeenCalledOnce()
    if (outcome.status === 'completed') outcome.value()
    expect(offClick).toHaveBeenCalledTimes(2)
    expect(hide).toHaveBeenCalledOnce()
  })
})
