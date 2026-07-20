import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useBookingStore } from '@client/store/booking.store'
import { renderAtRoute } from '@/test/render'
import { installWebApp, removeWebApp } from '@/test/web-app-fixture'

const supportMock = vi.hoisted(() => vi.fn())

vi.mock('@client/api/support.api', () => ({ startSupport: supportMock }))

import BottomNav from './BottomNav'

const BOT_URL = 'https://max.ru/client-support-bot'

describe('client BottomNav', () => {
  beforeEach(() => {
    supportMock.mockResolvedValue({ ok: true, botUrl: BOT_URL })
    useBookingStore.setState({ masterProfileLink: null })
  })

  it('скрывает Сообщения без master MAX profile link', () => {
    renderAtRoute(<BottomNav />)

    expect(screen.queryByRole('button', { name: 'Сообщения' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Профиль' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Записи' })).toBeInTheDocument()
  })

  it('показывает Сообщения при наличии master MAX profile link', () => {
    useBookingStore.setState({ masterProfileLink: 'https://max.ru/master-profile' })

    renderAtRoute(<BottomNav />)

    expect(screen.getByRole('button', { name: 'Сообщения' })).toBeInTheDocument()
  })

  it('переходит по tabs и отмечает active route', async () => {
    useBookingStore.setState({ masterProfileLink: 'https://max.ru/master-profile' })
    const { user, getLocation } = renderAtRoute(<BottomNav />, { route: '/my-bookings/booking-1' })

    expect(screen.getByText('Записи')).toHaveStyle({ color: 'var(--color-primary-surface)' })
    await user.click(screen.getByRole('button', { name: 'Сообщения' }))

    expect(getLocation().pathname).toBe('/messages')
  })

  it('открывает support через openMaxLink и не меняет route', async () => {
    const webApp = installWebApp()
    const { user, getLocation } = renderAtRoute(<BottomNav />, { route: '/my-bookings' })

    await user.click(screen.getByRole('button', { name: 'Поддержка' }))

    await waitFor(() => expect(webApp.openMaxLink).toHaveBeenCalledWith(BOT_URL))
    expect(getLocation().pathname).toBe('/my-bookings')
  })

  it('использует openLink когда openMaxLink capability отсутствует', async () => {
    const webApp = installWebApp()
    Object.defineProperty(webApp, 'openMaxLink', { configurable: true, value: undefined })
    const { user } = renderAtRoute(<BottomNav />)

    await user.click(screen.getByRole('button', { name: 'Поддержка' }))

    await waitFor(() => expect(webApp.openLink).toHaveBeenCalledWith(BOT_URL))
  })

  it('использует browser fallback когда WebApp отсутствует', async () => {
    removeWebApp()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const { user } = renderAtRoute(<BottomNav />)

    await user.click(screen.getByRole('button', { name: 'Поддержка' }))

    await waitFor(() => expect(open).toHaveBeenCalledWith(BOT_URL, '_blank'))
  })

  it('не запускает duplicate support request', async () => {
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
