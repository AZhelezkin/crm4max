import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import Button from './Button'

describe('Button', () => {
  it('рендерит текст', () => {
    render(<Button>Сохранить</Button>)
    expect(screen.getByText('Сохранить')).toBeInTheDocument()
  })

  it('вызывает onClick при клике', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Нажми</Button>)

    await user.click(screen.getByText('Нажми'))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('не вызывает onClick когда disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>Нажми</Button>)

    await user.click(screen.getByText('Нажми'))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('применяет стиль primary по умолчанию', () => {
    render(<Button>Текст</Button>)
    expect(screen.getByText('Текст')).toHaveStyle({ background: 'var(--color-primary-surface)' })
  })

  it('применяет стиль danger', () => {
    render(<Button variant="danger">Удалить</Button>)
    expect(screen.getByText('Удалить')).toHaveStyle({ color: 'var(--color-error-surface-accented)' })
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
