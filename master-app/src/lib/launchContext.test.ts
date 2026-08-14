import { beforeEach, describe, expect, it } from 'vitest'

import { installWebApp, removeWebApp } from '@/test/web-app-fixture'
import { createMaxLaunchContext, createTelegramLaunchContext, initializeLaunchContext, parseProfileLinkStartParam, parseTelegramMasterBookingStartParam, resetLaunchContextForTests } from './launchContext'

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

  it('принимает только точный master target из URL встроенной menu button', () => {
    window.Telegram = { WebApp: { initData: 'telegram-data', initDataUnsafe: {} } }
    window.history.replaceState(null, '', '/telegram.html?startapp=mmode')
    expect(createTelegramLaunchContext(new URLSearchParams())).toMatchObject({ appMode: 'master', startParam: 'mmode', startParamSource: 'query-startapp', authEndpoint: '/auth/telegram' })

    window.history.replaceState(null, '', '/telegram.html?startapp=client')
    expect(createTelegramLaunchContext(new URLSearchParams())).toMatchObject({ appMode: 'invalid', startParam: null, startParamSource: 'none' })
  })

  it('классифицирует Telegram startapp=msubscription как авторизованный запуск мастера', () => {
    window.Telegram = { WebApp: { initData: 'telegram-data', initDataUnsafe: {} } }
    window.history.replaceState(null, '', '/telegram.html?startapp=msubscription')

    expect(createTelegramLaunchContext(new URLSearchParams())).toMatchObject({
      provider: 'telegram',
      appMode: 'master',
      startParam: 'msubscription',
      startParamSource: 'query-startapp',
      authEndpoint: '/auth/telegram',
      authRole: 'master',
      tokenKey: 'telegramMasterToken',
    })
  })

  it('строго парсит Telegram master booking launch и классифицирует его как master', () => {
    const bookingId = '50000000-0000-4000-8000-000000000005'
    const startParam = `mbooking-${bookingId}`
    window.Telegram = { WebApp: { initData: 'telegram-data', initDataUnsafe: { start_param: startParam } } }

    expect(parseTelegramMasterBookingStartParam(startParam)).toBe(bookingId)
    expect(createTelegramLaunchContext(new URLSearchParams())).toMatchObject({
      appMode: 'master',
      authRole: 'master',
      startParam,
      startParamSource: 'telegram-sdk',
    })
  })

  it.each([
    'mbooking-',
    'mbooking-not-a-uuid',
    'mbooking-50000000-0000-4000-8000-000000000005-extra',
    'mbooking-10000000-0000-4000-8000-000000000001-50000000-0000-4000-8000-000000000005',
  ])('fail closed для malformed Telegram master booking launch %s', (startParam) => {
    window.Telegram = { WebApp: { initData: 'telegram-data', initDataUnsafe: { start_param: startParam } } }

    expect(parseTelegramMasterBookingStartParam(startParam)).toBeNull()
    expect(createTelegramLaunchContext(new URLSearchParams())).toMatchObject({ appMode: 'invalid', authRole: null })
  })

  it.each([
    'pl_0123456789abcdefghijklmnopqrstuv',
    'pl_0123456789ABCDEFGHIJKLMN_-qrstuv',
  ])('распознаёт строгий profile-link start param %s', (startParam) => {
    expect(parseProfileLinkStartParam(startParam)).toBe(startParam)
  })

  it.each([
    'pl_short',
    'PL_0123456789abcdefghijklmnopqrstuv',
    'pl_0123456789abcdefghijklmnopqrstu!',
    'xpl_0123456789abcdefghijklmnopqrstuv',
  ])('отклоняет malformed profile-link start param %s', (startParam) => {
    expect(parseProfileLinkStartParam(startParam)).toBeNull()
  })

  it('читает profile-link launch из MAX и Telegram contexts', () => {
    const startParam = 'pl_0123456789abcdefghijklmnopqrstuv'
    installWebApp({ initData: 'max-data', initDataUnsafe: { start_param: startParam } })
    expect(createMaxLaunchContext()).toMatchObject({ provider: 'max', startParam })

    window.Telegram = { WebApp: { initData: 'telegram-data', initDataUnsafe: { start_param: startParam } } }
    expect(createTelegramLaunchContext(new URLSearchParams())).toMatchObject({ provider: 'telegram', startParam })
  })

  it('читает profile-link start param напрямую из подписанного Telegram initData', () => {
    const startParam = 'pl_0123456789abcdefghijklmnopqrstuv'
    window.Telegram = { WebApp: { initData: new URLSearchParams({ start_param: startParam }).toString(), initDataUnsafe: {} } }

    expect(createTelegramLaunchContext(new URLSearchParams())).toMatchObject({ provider: 'telegram', startParam, startParamSource: 'telegram-sdk' })
  })
})
