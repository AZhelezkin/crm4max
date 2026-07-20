import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { installBrowserFixture } from '@/test/browser-fixture'
import { renderAtRoute } from '@/test/render'
import { installWebApp, removeWebApp } from '@/test/web-app-fixture'

const supportMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/support.api', () => ({ startSupport: supportMock }))

import BottomNav from './BottomNav'

const BOT_URL = 'https://max.ru/master-support-bot'

describe('master BottomNav', () => {
  beforeEach(() => {
    supportMock.mockResolvedValue({ ok: true, botUrl: BOT_URL })
  })

  it('переходит по route tabs', async () => {
    const { user, getLocation } = renderAtRoute(<BottomNav />, { route: '/' })

    await user.click(screen.getByRole('button', { name: 'Записи' }))
    expect(getLocation().pathname).toBe('/bookings')

    await user.click(screen.getByRole('button', { name: 'Доход' }))
    expect(getLocation().pathname).toBe('/income')
  })

  it('отмечает nested bookings route активным цветом', () => {
    renderAtRoute(<BottomNav />, { route: '/bookings/booking-1' })

    const label = screen.getByText('Записи')
    expect(label).toHaveStyle({ color: 'var(--color-active-element)' })
    expect(screen.getByText('Главная')).toHaveStyle({ color: 'var(--color-on-surface-secondary)' })
  })

  it('открывает support через openMaxLink', async () => {
    const webApp = installWebApp()
    const { user, getLocation } = renderAtRoute(<BottomNav />, { route: '/income' })

    await user.click(screen.getByRole('button', { name: 'Поддержка' }))

    await waitFor(() => expect(webApp.openMaxLink).toHaveBeenCalledWith(BOT_URL))
    expect(webApp.openLink).not.toHaveBeenCalled()
    expect(getLocation().pathname).toBe('/income')
  })

  it('использует openLink когда openMaxLink недоступен', async () => {
    const webApp = installWebApp({ openMaxLink: undefined })
    const { user } = renderAtRoute(<BottomNav />)

    await user.click(screen.getByRole('button', { name: 'Поддержка' }))

    await waitFor(() => expect(webApp.openLink).toHaveBeenCalledWith(BOT_URL))
  })

  it('использует browser fallback без WebApp', async () => {
    const browser = installBrowserFixture()
    removeWebApp()
    const { user } = renderAtRoute(<BottomNav />)

    await user.click(screen.getByRole('button', { name: 'Поддержка' }))

    await waitFor(() => expect(browser.open).toHaveBeenCalledWith(BOT_URL, '_blank'))
  })

  it('показывает ошибку и не открывает URL при API failure', async () => {
    supportMock.mockRejectedValue(new Error('support failed'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined)
    const webApp = installWebApp()
    const { user } = renderAtRoute(<BottomNav />)

    await user.click(screen.getByRole('button', { name: 'Поддержка' }))

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Не удалось открыть поддержку. Попробуйте позже.'))
    expect(error).toHaveBeenCalled()
    expect(webApp.openMaxLink).not.toHaveBeenCalled()
  })

  it('не запускает duplicate support request пока первый pending', async () => {
    let resolveSupport: ((value: { ok: true; botUrl: string }) => void) | undefined
    supportMock.mockImplementation(() => new Promise((resolve) => {
      resolveSupport = resolve
    }))
    installWebApp()
    const { user } = renderAtRoute(<BottomNav />)

    await user.click(screen.getByRole('button', { name: 'Поддержка' }))
    await user.click(screen.getByRole('button', { name: 'Поддержка' }))

    expect(supportMock).toHaveBeenCalledOnce()

    resolveSupport?.({ ok: true, botUrl: BOT_URL })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Поддержка' })).toBeEnabled())
  })
})
