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
      <Route path="/" element={<div>Кабинет</div>} />
    </Routes>,
    { route: '/welcome' },
  )
}

// Пройти шаг согласий целиком: отметить оба чекбокса и нажать «Подключить».
async function acceptConsents(user: ReturnType<typeof renderPage>['user']) {
  await user.click(screen.getByRole('button', { name: /Я принимаю условия/ }))
  await user.click(screen.getByRole('button', { name: /Я даю согласие/ }))
  await user.click(screen.getByRole('button', { name: 'Подключить' }))
}

describe('WelcomePage', () => {
  beforeEach(() => {
    api.updateProfile.mockReset()
    api.getMe.mockReset()
    vi.spyOn(window, 'open').mockImplementation(() => null)
    useAuthStore.setState({ token: null, master: null, isLoading: false })
  })

  it('старт → согласия → кабинет; без карты и без выбора периода', async () => {
    const webApp = installWebApp()
    const open = vi.mocked(window.open)
    const master = createMasterProfile({ isOnboarded: true })
    api.updateProfile.mockResolvedValue(master)
    api.getMe.mockResolvedValue(master)
    const view = renderPage()

    await view.user.click(screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' }))
    expect(screen.getByText('Необходимые согласия')).toBeInTheDocument()
    // Онбординг ещё не завершён — только показан шаг согласий.
    expect(api.updateProfile).not.toHaveBeenCalled()

    await acceptConsents(view.user)

    expect(api.updateProfile).toHaveBeenCalledWith({ isOnboarded: true })
    await waitFor(() => expect(view.getLocation().pathname).toBe('/'))
    expect(useAuthStore.getState().master).toEqual(master)
    // Форма карты на онбординге не открывается вовсе.
    expect(webApp.openLink).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it('«Подключить» без обоих согласий не завершает онбординг', async () => {
    const view = renderPage()
    await view.user.click(screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' }))

    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))
    expect(api.updateProfile).not.toHaveBeenCalled()

    // Одного согласия мало.
    await view.user.click(screen.getByRole('button', { name: /Я принимаю условия/ }))
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))
    expect(api.updateProfile).not.toHaveBeenCalled()
    expect(view.getLocation().pathname).toBe('/welcome')
  })

  it('назад с шага согласий возвращает на стартовый экран', async () => {
    const view = renderPage()
    await view.user.click(screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' }))

    await view.user.click(screen.getByRole('button', { name: 'Назад' }))

    expect(screen.getByText('499 ₽/мес.')).toBeInTheDocument()
    expect(api.updateProfile).not.toHaveBeenCalled()
  })

  it('не дублирует profile mutation пока первый finish pending', async () => {
    let resolveUpdate: (() => void) | undefined
    api.updateProfile.mockImplementation(() => new Promise<void>((resolve) => {
      resolveUpdate = resolve
    }))
    api.getMe.mockResolvedValue(createMasterProfile())
    const view = renderPage()
    await view.user.click(screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' }))
    await view.user.click(screen.getByRole('button', { name: /Я принимаю условия/ }))
    await view.user.click(screen.getByRole('button', { name: /Я даю согласие/ }))

    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))
    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))

    expect(api.updateProfile).toHaveBeenCalledOnce()
    resolveUpdate?.()
    await waitFor(() => expect(view.getLocation().pathname).toBe('/'))
  })

  it('остаётся на согласиях после profile failure и разрешает повторить', async () => {
    const master = createMasterProfile()
    api.updateProfile.mockRejectedValueOnce(new Error('profile unavailable')).mockResolvedValueOnce(master)
    api.getMe.mockResolvedValue(master)
    const view = renderPage()
    await view.user.click(screen.getByRole('button', { name: 'Попробовать бесплатно 7 дней' }))

    await acceptConsents(view.user)
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledTimes(1))
    expect(view.getLocation().pathname).toBe('/welcome')

    await view.user.click(screen.getByRole('button', { name: 'Подключить' }))
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/'))
  })
})
