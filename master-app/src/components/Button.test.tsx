import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from './Button'

describe('Button', () => {
  it('рендерит текст', () => {
    render(<Button>Сохранить</Button>)
    expect(screen.getByText('Сохранить')).toBeInTheDocument()
  })

  it('вызывает onClick при клике', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Нажми</Button>)
    fireEvent.click(screen.getByText('Нажми'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('не вызывает onClick когда disabled', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>Нажми</Button>)
    fireEvent.click(screen.getByText('Нажми'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('применяет стиль primary по умолчанию', () => {
    render(<Button>Текст</Button>)
    const btn = screen.getByText('Текст')
    expect(btn).toHaveStyle({ background: 'var(--color-primary-surface)' })
  })

  it('применяет стиль danger', () => {
    render(<Button variant="danger">Удалить</Button>)
    const btn = screen.getByText('Удалить')
    expect(btn).toHaveStyle({ color: 'var(--color-error-surface-accented)' })
  })

  it('растягивается на всю ширину при fullWidth', () => {
    render(<Button fullWidth>Кнопка</Button>)
    expect(screen.getByText('Кнопка')).toHaveStyle({ width: '100%' })
  })

  it('снижает opacity когда disabled', () => {
    render(<Button disabled>Кнопка</Button>)
    expect(screen.getByText('Кнопка')).toHaveStyle({ opacity: 0.5 })
  })
})
