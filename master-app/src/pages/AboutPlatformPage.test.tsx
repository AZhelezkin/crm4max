import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderAtRoute } from '@/test/render'

import AboutPlatformPage from './AboutPlatformPage'

// Слайдер фич крутится по setInterval — фейковые таймеры, чтобы не тикал в тестах.
vi.useFakeTimers()

afterEach(() => {
  vi.clearAllTimers()
})

describe('AboutPlatformPage', () => {
  it('рендерит заголовок, подзаголовок, возможности и реквизиты', () => {
    renderAtRoute(<AboutPlatformPage />, { route: '/about-platform' })

    expect(screen.getByText('О платформе')).toBeInTheDocument()
    expect(screen.getByText(/Это платформа для записи клиентов/)).toBeInTheDocument()
    expect(screen.getByText('Кабинет для управления бизнесом')).toBeInTheDocument()
    expect(screen.getByText('Личный AI-ассистент')).toBeInTheDocument()
    expect(screen.getByText('Помощник для твоих клиентов')).toBeInTheDocument()
    expect(screen.getByText('Управляй бизнесом грамотно!')).toBeInTheDocument()
    expect(screen.getByText('ООО «Система», 2026 год')).toBeInTheDocument()
    expect(screen.getByText('ИНН 9706002253, ОГРН 1197746529640')).toBeInTheDocument()
    expect(screen.getByTestId('feature-slider-viewport')).toHaveStyle({ left: '-16px', right: '-16px' })
  })

  it('кнопка «Назад» возвращает на предыдущий экран', async () => {
    const { user, getLocation } = renderAtRoute(
      <AboutPlatformPage />,
      { entries: ['/other', '/about-platform'] },
    )

    await user.click(screen.getByRole('button', { name: 'Назад' }))
    expect(getLocation().pathname).toBe('/other')
  })
})
