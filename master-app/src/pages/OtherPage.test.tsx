import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { installBrowserFixture } from '@/test/browser-fixture'
import { renderAtRoute } from '@/test/render'
import { installWebApp, removeWebApp } from '@/test/web-app-fixture'

const supportMock = vi.hoisted(() => vi.fn())
const profileLinkMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/support.api', () => ({ startSupport: supportMock }))
vi.mock('@/api/messenger-profile-links.api', () => ({
  createMessengerProfileLink: profileLinkMock,
}))

import OtherPage from './OtherPage'

const BOT_URL = 'https://max.ru/master-support-bot'
const SUPPORT = 'Техническая поддержка'
const LINK_PROFILES = 'Связать профили'

// Поддержка переехала сюда из навбара (макеты 10302-42755, 10338-42120):
// «Другое» — вкладка навбара, поэтому кнопки «назад» на экране нет.
describe('master OtherPage', () => {
  beforeEach(() => {
    supportMock.mockResolvedValue({ ok: true, botUrl: BOT_URL })
    profileLinkMock.mockResolvedValue({ destination: 'max', url: 'https://max.ru/profile-link', expiresIn: 20 })
  })

  it('показывает заголовок без кнопки «Назад» — переключение идёт навбаром', () => {
    renderAtRoute(<OtherPage />, { route: '/other' })

    expect(screen.getByText('Другое')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Назад' })).not.toBeInTheDocument()
  })

  it('все пункты меню активны', () => {
    renderAtRoute(<OtherPage />, { route: '/other' })

    expect(screen.getByRole('button', { name: 'Согласия' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Способы оплаты' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Подписка' })).toBeEnabled()
    expect(screen.getByRole('button', { name: SUPPORT })).toBeEnabled()
    expect(screen.getByRole('button', { name: LINK_PROFILES })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'О платформе' })).toBeEnabled()
  })

  it('открывает MAX destination для связывания профилей', async () => {
    const webApp = installWebApp()
    const { user } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: LINK_PROFILES }))

    await waitFor(() => expect(webApp.openMaxLink).toHaveBeenCalledWith('https://max.ru/profile-link'))
  })

  it('открывает Telegram destination для связывания профилей', async () => {
    window.__MINI_APP_PROVIDER__ = 'telegram'
    const openTelegramLink = vi.fn()
    window.Telegram = { WebApp: { openTelegramLink } }
    profileLinkMock.mockResolvedValue({ destination: 'telegram', url: 'https://t.me/profile_link_bot?startapp=pl_token', expiresIn: 20 })
    const { user } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: LINK_PROFILES }))

    await waitFor(() => expect(openTelegramLink).toHaveBeenCalledWith('https://t.me/profile_link_bot?startapp=pl_token'))
  })

  it('показывает ошибку связывания при API failure', async () => {
    profileLinkMock.mockRejectedValue(new Error('failed'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined)
    const webApp = installWebApp()
    const { user } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: LINK_PROFILES }))

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Не удалось связать профили. Попробуйте позже.'))
    expect(webApp.openMaxLink).not.toHaveBeenCalled()
  })

  it('не запускает duplicate profile-link request пока первый pending', async () => {
    let resolveLink: ((value: { destination: 'max'; url: string; expiresIn: number }) => void) | undefined
    profileLinkMock.mockImplementation(() => new Promise((resolve) => {
      resolveLink = resolve
    }))
    installWebApp()
    const { user } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: LINK_PROFILES }))
    await user.click(screen.getByRole('button', { name: LINK_PROFILES }))

    expect(profileLinkMock).toHaveBeenCalledOnce()
    resolveLink?.({ destination: 'max', url: 'https://max.ru/profile-link', expiresIn: 20 })
    await waitFor(() => expect(screen.getByRole('button', { name: LINK_PROFILES })).toBeEnabled())
  })

  it('«Согласия» ведут на экран документов', async () => {
    const { user, getLocation } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: 'Согласия' }))
    expect(getLocation().pathname).toBe('/consents')
  })

  it('«Способы оплаты» ведёт на экран карты', async () => {
    const { user, getLocation } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: 'Способы оплаты' }))
    expect(getLocation().pathname).toBe('/payment-methods')
  })

  it('«Подписка» ведёт на экран подписки', async () => {
    const { user, getLocation } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: 'Подписка' }))
    expect(getLocation().pathname).toBe('/subscription')
  })

  it('«О платформе» ведёт на экран платформы', async () => {
    const { user, getLocation } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: 'О платформе' }))
    expect(getLocation().pathname).toBe('/about-platform')
  })

  it('открывает support через openMaxLink', async () => {
    const webApp = installWebApp()
    const { user, getLocation } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: SUPPORT }))

    await waitFor(() => expect(webApp.openMaxLink).toHaveBeenCalledWith(BOT_URL))
    expect(webApp.openLink).not.toHaveBeenCalled()
    expect(getLocation().pathname).toBe('/other')
  })

  it('использует openLink когда openMaxLink недоступен', async () => {
    const webApp = installWebApp({ openMaxLink: undefined })
    const { user } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: SUPPORT }))

    await waitFor(() => expect(webApp.openLink).toHaveBeenCalledWith(BOT_URL))
  })

  it('использует browser fallback без WebApp', async () => {
    const browser = installBrowserFixture()
    removeWebApp()
    const { user } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: SUPPORT }))

    await waitFor(() => expect(browser.open).toHaveBeenCalledWith(BOT_URL, '_blank', 'noopener,noreferrer'))
  })

  it('показывает ошибку и не открывает URL при API failure', async () => {
    supportMock.mockRejectedValue(new Error('support failed'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined)
    const webApp = installWebApp()
    const { user } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: SUPPORT }))

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
    const { user } = renderAtRoute(<OtherPage />, { route: '/other' })

    await user.click(screen.getByRole('button', { name: SUPPORT }))
    await user.click(screen.getByRole('button', { name: SUPPORT }))

    expect(supportMock).toHaveBeenCalledOnce()

    resolveSupport?.({ ok: true, botUrl: BOT_URL })
    await waitFor(() => expect(screen.getByRole('button', { name: SUPPORT })).toBeEnabled())
  })
})
