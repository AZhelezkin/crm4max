import { describe, expect, it, vi } from 'vitest'

import { installWebApp, removeWebApp } from '@/test/web-app-fixture'

import bridge, { closeWebApp } from './bridge'

describe('legacy VK bridge shim', () => {
  it('закрывает MAX WebApp только при доступном provider method', () => {
    const webApp = installWebApp()
    expect(closeWebApp()).toBe(true)
    expect(webApp.close).toHaveBeenCalledOnce()

    removeWebApp()
    expect(closeWebApp()).toBe(false)
  })

  it('делегирует init в WebApp.ready', async () => {
    const webApp = installWebApp()

    await expect(bridge.send('VKWebAppInit')).resolves.toEqual({})
    expect(webApp.ready).toHaveBeenCalledOnce()
  })

  it('возвращает MAX init data и user id как auth token result', async () => {
    installWebApp({
      initData: 'signed-init-data',
      initDataUnsafe: {
        user: { id: 12345, first_name: 'Ирина', last_name: 'Тестова' },
      },
    })

    await expect(bridge.send('VKWebAppGetAuthToken')).resolves.toEqual({
      access_token: 'signed-init-data',
      user_id: 12345,
    })
  })

  it('возвращает user_id 0 без user payload', async () => {
    installWebApp({ initDataUnsafe: {} })

    await expect(bridge.send('VKWebAppGetAuthToken')).resolves.toEqual({
      access_token: 'signed-max-init-data',
      user_id: 0,
    })
  })

  it('fail closed для auth без MAX WebApp', async () => {
    removeWebApp()

    await expect(bridge.send('VKWebAppGetAuthToken')).rejects.toThrow('MAX WebApp unavailable')
  })

  it.each([
    'VKWebAppAddToCalendar',
    'VKWebAppOpenApp',
  ])('возвращает пустой legacy result для %s', async (method) => {
    const webApp = installWebApp()

    await expect(bridge.send(method)).resolves.toEqual({})
    expect(webApp.openLink).not.toHaveBeenCalled()
    expect(webApp.openMaxLink).not.toHaveBeenCalled()
  })

  it('логирует unsupported pay form без native effect', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const webApp = installWebApp()

    await expect(bridge.send('VKWebAppOpenPayForm')).resolves.toEqual({})

    expect(warning).toHaveBeenCalledWith('VKWebAppOpenPayForm не поддерживается в Max')
    expect(webApp.openLink).not.toHaveBeenCalled()
  })

  it('логирует неизвестный method и его params', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const params = { value: 'test' }

    await expect(bridge.send('UnknownMethod', params)).resolves.toEqual({})

    expect(warning).toHaveBeenCalledWith('bridge.send: неизвестный метод "UnknownMethod"', params)
  })
})
