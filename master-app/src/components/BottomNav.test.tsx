import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderAtRoute } from '@/test/render'

import BottomNav from './BottomNav'

// Поддержка переехала из навбара на экран «Другое» — её тесты в pages/OtherPage.test.tsx.
describe('master BottomNav', () => {
  it('переходит по route tabs', async () => {
    const { user, getLocation } = renderAtRoute(<BottomNav />, { route: '/' })

    await user.click(screen.getByRole('button', { name: 'Записи' }))
    expect(getLocation().pathname).toBe('/bookings')

    await user.click(screen.getByRole('button', { name: 'Доход' }))
    expect(getLocation().pathname).toBe('/income')

    await user.click(screen.getByRole('button', { name: 'Другое' }))
    expect(getLocation().pathname).toBe('/other')
  })

  it('отмечает nested bookings route активным цветом', () => {
    renderAtRoute(<BottomNav />, { route: '/bookings/booking-1' })

    const label = screen.getByText('Записи')
    expect(label).toHaveStyle({ color: 'var(--color-active-element)' })
    expect(screen.getByText('Главная')).toHaveStyle({ color: 'var(--color-on-surface-secondary)' })
  })

  it('подсвечивает вкладку «Другое» на своём роуте', () => {
    renderAtRoute(<BottomNav />, { route: '/other' })

    expect(screen.getByText('Другое')).toHaveStyle({ color: 'var(--color-active-element)' })
    expect(screen.getByText('Главная')).toHaveStyle({ color: 'var(--color-on-surface-secondary)' })
  })
})
