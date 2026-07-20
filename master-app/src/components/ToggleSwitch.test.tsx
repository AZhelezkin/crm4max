import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ToggleSwitch from './ToggleSwitch'

describe('ToggleSwitch', () => {
  it('передаёт accessible name и pressed state', () => {
    render(<ToggleSwitch checked aria-label="Напоминание" onChange={() => {}} />)

    expect(screen.getByRole('button', { name: 'Напоминание' })).toHaveAttribute('aria-pressed', 'true')
  })

  it.each([
    [false, true],
    [true, false],
  ])('переключает %s в %s', async (checked, expected) => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ToggleSwitch checked={checked} aria-label="Переключатель" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Переключатель' }))

    expect(onChange).toHaveBeenCalledWith(expected)
  })

  it('не вызывает onChange когда disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ToggleSwitch checked={false} disabled aria-label="Переключатель" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Переключатель' }))

    expect(onChange).not.toHaveBeenCalled()
  })
})
