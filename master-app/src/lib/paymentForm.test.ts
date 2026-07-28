import { afterEach, describe, expect, it, vi } from 'vitest'

import { installWebApp, removeWebApp } from '@/test/web-app-fixture'
import { openCardBindingForm } from './paymentForm'

describe('openCardBindingForm', () => {
  afterEach(() => removeWebApp())

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
