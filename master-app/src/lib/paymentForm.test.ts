import { afterEach, describe, expect, it, vi } from 'vitest'

import { installWebApp, removeWebApp } from '@/test/web-app-fixture'
import { openCardBindingForm, openPaymentForm } from './paymentForm'

describe('openCardBindingForm', () => {
  afterEach(() => {
    removeWebApp()
    delete window.Telegram
    delete window.__MINI_APP_PROVIDER__
  })

  it('оставляет mini-app открытым и передаёт AddCard во внешний браузер Max', () => {
    const webApp = installWebApp()

    openCardBindingForm('https://pay.test/add-card')

    expect(webApp.openLink).toHaveBeenCalledWith('https://pay.test/add-card')
  })

  it('использует новую вкладку вне Max', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)

    openCardBindingForm('https://pay.test/add-card')

    expect(open).toHaveBeenCalledWith('https://pay.test/add-card', '_blank', 'noopener,noreferrer')
  })
})

describe('openPaymentForm', () => {
  it('открывает банковскую форму через Telegram WebApp без потери mini-app context', () => {
    const openLink = vi.fn()
    window.__MINI_APP_PROVIDER__ = 'telegram'
    window.Telegram = { WebApp: { initData: 'signed', initDataUnsafe: {}, openLink } }

    openPaymentForm('https://pay.test/subscription')

    expect(openLink).toHaveBeenCalledWith('https://pay.test/subscription')
  })
})
