import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import Card from './Card'

describe('Card', () => {
  it('рендерит дочерние элементы', () => {
    render(<Card><span>Контент</span></Card>)
    expect(screen.getByText('Контент')).toBeInTheDocument()
  })

  it('вызывает onClick при клике', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Card onClick={onClick}>Клик</Card>)

    await user.click(screen.getByText('Клик'))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('не устанавливает cursor: pointer без onClick', () => {
    render(<Card>Без клика</Card>)
    expect(screen.getByText('Без клика').parentElement).not.toHaveStyle({ cursor: 'pointer' })
  })

  it('устанавливает cursor: pointer с onClick', () => {
    render(<Card onClick={() => {}}>С кликом</Card>)
    expect(screen.getByText('С кликом')).toHaveStyle({ cursor: 'pointer' })
  })
})
