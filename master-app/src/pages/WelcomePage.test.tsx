import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterProfile } from '@/test/fixtures/masters'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'

const api = vi.hoisted(() => ({
  startTrial: vi.fn(),
  updateProfile: vi.fn(),
  getMe: vi.fn(),
}))

vi.mock('@/api/subscription.api', () => ({
  subscriptionApi: { startTrial: api.startTrial },
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
    api.startTrial.mockReset()
    api.updateProfile.mockReset()
    api.getMe.mockReset()
    vi.spyOn(window, 'open').mockImplementation(() => null)
    useAuthStore.setState({ token: null, master: null, isLoading: false })
  })

  it('prefetch trial URL, открывает его через MAX и завершает onboarding', async () => {
    const webApp = installWebApp()
    const master = createMasterProfile({ isOnboarded: true })
    api.startTrial.mockResolvedValue({ paymentURL: 'https://pay.test/trial' })
    api.updateProfile.mockResolvedValue(master)
    api.getMe.mockResolvedValue(master)
    const view = renderPage()
    await waitFor(() => expect(api.startTrial).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' }))

    expect(webApp.openLink).toHaveBeenCalledWith('https://pay.test/trial')
    expect(api.updateProfile).toHaveBeenCalledWith({ isOnboarded: true })
    await waitFor(() => expect(view.getLocation().pathname).toBe('/subscription'))
    expect(useAuthStore.getState().master).toEqual(master)
  })

  it('использует browser window.open без MAX bridge', async () => {
    const open = vi.mocked(window.open)
    const master = createMasterProfile()
    api.startTrial.mockResolvedValue({ paymentURL: 'https://pay.test/browser-trial' })
    api.updateProfile.mockResolvedValue(master)
    api.getMe.mockResolvedValue(master)
    const view = renderPage()
    await waitFor(() => expect(api.startTrial).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' }))

    expect(open).toHaveBeenCalledWith('https://pay.test/browser-trial', '_blank')
    await waitFor(() => expect(view.getLocation().pathname).toBe('/subscription'))
  })

  it('не дублирует profile mutation пока первый finish pending', async () => {
    let resolveUpdate: (() => void) | undefined
    api.startTrial.mockResolvedValue({ paymentURL: 'https://pay.test/trial' })
    api.updateProfile.mockImplementation(() => new Promise<void>((resolve) => {
      resolveUpdate = resolve
    }))
    api.getMe.mockResolvedValue(createMasterProfile())
    const view = renderPage()
    await waitFor(() => expect(api.startTrial).toHaveBeenCalledOnce())
    const button = screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' })

    await view.user.click(button)
    await view.user.click(button)

    expect(api.updateProfile).toHaveBeenCalledOnce()
    resolveUpdate?.()
    await waitFor(() => expect(view.getLocation().pathname).toBe('/subscription'))
  })

  it('остаётся на welcome после profile failure и разрешает повторить', async () => {
    const master = createMasterProfile()
    api.startTrial.mockResolvedValue({ paymentURL: 'https://pay.test/trial' })
    api.updateProfile.mockRejectedValueOnce(new Error('profile unavailable')).mockResolvedValueOnce(master)
    api.getMe.mockResolvedValue(master)
    const view = renderPage()
    await waitFor(() => expect(api.startTrial).toHaveBeenCalledOnce())
    const button = screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' })

    await view.user.click(button)
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledTimes(1))
    expect(view.getLocation().pathname).toBe('/welcome')

    await view.user.click(button)
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/subscription'))
  })

  it('завершает onboarding без внешнего перехода если trial URL prefetch упал', async () => {
    const webApp = installWebApp()
    const master = createMasterProfile()
    api.startTrial.mockRejectedValue(new Error('trial unavailable'))
    api.updateProfile.mockResolvedValue(master)
    api.getMe.mockResolvedValue(master)
    const view = renderPage()
    await waitFor(() => expect(api.startTrial).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' }))

    expect(webApp.openLink).not.toHaveBeenCalled()
    await waitFor(() => expect(view.getLocation().pathname).toBe('/subscription'))
  })
})
