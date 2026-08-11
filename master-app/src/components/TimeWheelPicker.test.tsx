import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import TimeWheelPicker from './TimeWheelPicker'

describe('TimeWheelPicker', () => {
  it('выбирает часы и минуты независимыми колонками', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <TimeWheelPicker
        open
        value="10:00"
        getTone={(value) => value === '11:15' ? 'warning' : 'success'}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    )

    const hours = screen.getByRole('listbox', { name: 'Часы' })
    const minutes = screen.getByRole('listbox', { name: 'Минуты' })
    hours.scrollTop = 11 * 30
    minutes.scrollTop = 30
    fireEvent.scroll(hours)
    fireEvent.scroll(minutes)
    await user.click(screen.getByRole('button', { name: 'Выбрать' }))

    expect(onSelect).toHaveBeenCalledWith('11:15')
  })

  it('не показывает время раньше минимального и оставляет часы нейтральными', () => {
    render(
      <TimeWheelPicker
        open
        value="12:30"
        minTime="12:30"
        getTone={() => 'error'}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const hours = screen.getByRole('listbox', { name: 'Часы' })
    const minutes = screen.getByRole('listbox', { name: 'Минуты' })
    expect(hours).not.toHaveTextContent('11')
    expect(minutes).not.toHaveTextContent('15')
    expect(screen.getByRole('option', { name: '12' })).toHaveStyle({ color: 'var(--color-on-surface)' })
  })
})
