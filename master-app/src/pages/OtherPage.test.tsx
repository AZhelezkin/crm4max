import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { installBrowserFixture } from '@/test/browser-fixture'
import { renderAtRoute } from '@/test/render'
import { installWebApp, removeWebApp } from '@/test/web-app-fixture'

const supportMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/support.api', () => ({ startSupport: supportMock }))

import OtherPage from './OtherPage'

const BOT_URL = 'https://max.ru/master-support-bot'
const SUPPORT = 'Техническая поддержка'

// Поддержка переехала сюда из навбара (макеты 10302-42755, 10338-42120):
// «Другое» — вкладка навбара, поэтому кнопки «назад» на экране нет.
describe('master OtherPage', () => {
  beforeEach(() => {
    supportMock.mockResolvedValue({ ok: true, botUrl: BOT_URL })
  })

  it('показывает заголовок без кнопки «Назад» — переключение идёт навбаром', () => {
    renderAtRoute(<OtherPage />, { route: '/other' })

    expect(screen.getByText('Другое')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Назад' })).not.toBeInTheDocument()
  })

  it('неактивны только «Согласия»; остальные пункты ведут на свои экраны', () => {
    renderAtRoute(<OtherPage />, { route: '/other' })

    expect(screen.getByRole('button', { name: 'Согласия' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Способы оплаты' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Подписка' })).toBeEnabled()
    expect(screen.getByRole('button', { name: SUPPORT })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'О платформе' })).toBeEnabled()
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

    await waitFor(() => expect(browser.open).toHaveBeenCalledWith(BOT_URL, '_blank'))
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
