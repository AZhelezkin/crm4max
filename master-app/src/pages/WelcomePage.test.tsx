import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterProfile } from '@/test/fixtures/masters'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'

const api = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  getMe: vi.fn(),
}))

vi.mock('@/api/masters.api', () => ({
  mastersApi: {
    updateProfile: api.updateProfile,
    getMe: api.getMe,
  },
}))

import { useAuthStore } from '@/store/auth.store'

import WelcomePage from './WelcomePage'

function renderPage() {
  return renderAtRoute(
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/subscription" element={<div>Экран подписки</div>} />
    </Routes>,
    { route: '/welcome' },
  )
}

describe('WelcomePage', () => {
  beforeEach(() => {
    api.updateProfile.mockReset()
    api.getMe.mockReset()
    vi.spyOn(window, 'open').mockImplementation(() => null)
    useAuthStore.setState({ token: null, master: null, isLoading: false })
  })

  it('ведёт на экран выбора периода и завершает onboarding — без привязки карты', async () => {
    const webApp = installWebApp()
    const open = vi.mocked(window.open)
    const master = createMasterProfile({ isOnboarded: true })
    api.updateProfile.mockResolvedValue(master)
    api.getMe.mockResolvedValue(master)
    const view = renderPage()

    await view.user.click(screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' }))

    expect(api.updateProfile).toHaveBeenCalledWith({ isOnboarded: true })
    await waitFor(() => expect(view.getLocation().pathname).toBe('/subscription'))
    expect(useAuthStore.getState().master).toEqual(master)
    // Форма карты больше не открывается со стартового экрана.
    expect(webApp.openLink).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it('не дублирует profile mutation пока первый finish pending', async () => {
    let resolveUpdate: (() => void) | undefined
    api.updateProfile.mockImplementation(() => new Promise<void>((resolve) => {
      resolveUpdate = resolve
    }))
    api.getMe.mockResolvedValue(createMasterProfile())
    const view = renderPage()
    const button = screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' })

    await view.user.click(button)
    await view.user.click(button)

    expect(api.updateProfile).toHaveBeenCalledOnce()
    resolveUpdate?.()
    await waitFor(() => expect(view.getLocation().pathname).toBe('/subscription'))
  })

  it('остаётся на welcome после profile failure и разрешает повторить', async () => {
    const master = createMasterProfile()
    api.updateProfile.mockRejectedValueOnce(new Error('profile unavailable')).mockResolvedValueOnce(master)
    api.getMe.mockResolvedValue(master)
    const view = renderPage()
    const button = screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' })

    await view.user.click(button)
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledTimes(1))
    expect(view.getLocation().pathname).toBe('/welcome')

    await view.user.click(button)
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/subscription'))
  })
})
