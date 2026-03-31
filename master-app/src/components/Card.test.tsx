import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Card from './Card'

describe('Card', () => {
  it('рендерит дочерние элементы', () => {
    render(<Card><span>Контент</span></Card>)
    expect(screen.getByText('Контент')).toBeInTheDocument()
  })

  it('вызывает onClick при клике', () => {
    const onClick = vi.fn()
    render(<Card onClick={onClick}>Клик</Card>)
    fireEvent.click(screen.getByText('Клик'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('не устанавливает cursor: pointer без onClick', () => {
    render(<Card>Без клика</Card>)
    const card = screen.getByText('Без клика').parentElement
    expect(card).not.toHaveStyle({ cursor: 'pointer' })
  })

  it('устанавливает cursor: pointer с onClick', () => {
    render(<Card onClick={() => {}}>С кликом</Card>)
    const card = screen.getByText('С кликом')
    expect(card).toHaveStyle({ cursor: 'pointer' })
  })
})
