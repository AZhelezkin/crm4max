import { beforeEach, describe, expect, it } from 'vitest'

import { installWebApp, removeWebApp } from '@/test/web-app-fixture'
import { createMaxLaunchContext, createTelegramLaunchContext, initializeLaunchContext, resetLaunchContextForTests } from './launchContext'

describe('launch context', () => {
  beforeEach(() => {
    resetLaunchContextForTests()
    removeWebApp()
    delete window.Telegram
    window.history.replaceState(null, '', '/')
  })

  it('сохраняет MAX precedence и immutable snapshot', () => {
    installWebApp({ initData: 'max-data', initDataUnsafe: { start_param: 'mmode' } })
    window.history.replaceState(null, '', '/?startapp=cmasters&masterId=10000000-0000-4000-8000-000000000001')
    const context = initializeLaunchContext(createMaxLaunchContext())

    window.WebApp!.initDataUnsafe!.start_param = 'cmasters'

    expect(context).toMatchObject({ provider: 'max', appMode: 'master', startParam: 'mmode', startParamSource: 'max-sdk', authEndpoint: '/auth/max', tokenKey: 'masterToken' })
    expect(Object.isFrozen(context)).toBe(true)
  })

  it('предпочитает Telegram SDK fragment и не читает MAX query', () => {
    window.Telegram = { WebApp: { initData: 'telegram-data', initDataUnsafe: { start_param: 'mmode' } } }
    window.history.replaceState(null, '', '/?startapp=cmasters')
    const context = createTelegramLaunchContext(new URLSearchParams('tgWebAppStartParam=unknown'))

    expect(context).toMatchObject({ appMode: 'master', startParam: 'mmode', startParamSource: 'telegram-sdk', authEndpoint: '/auth/telegram', tokenKey: 'telegramMasterToken' })
  })

  it.each(['', 'unknown'])('fail closed для Telegram target %s', (startParam) => {
    const fragment = new URLSearchParams(startParam ? `tgWebAppStartParam=${startParam}` : '')
    expect(createTelegramLaunchContext(fragment)).toMatchObject({ appMode: 'invalid', authRole: null, tokenKey: 'telegramMasterToken' })
  })
})
