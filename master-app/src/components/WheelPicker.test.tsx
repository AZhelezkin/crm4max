import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import WheelPicker from './WheelPicker'

const options = [
  { value: 'first', label: 'Первый' },
  { value: 'second', label: 'Второй' },
  { value: 'third', label: 'Третий' },
]

function renderPicker(overrides: Partial<Parameters<typeof WheelPicker>[0]> = {}) {
  const props = {
    open: true,
    value: 'second',
    options,
    onSelect: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<WheelPicker {...props} />)
  return props
}

describe('WheelPicker', () => {
  it('ничего не рендерит когда закрыт', () => {
    renderPicker({ open: false })

    expect(screen.queryByRole('button', { name: 'Выбрать' })).not.toBeInTheDocument()
  })

  it('подтверждает текущее значение и закрывается', async () => {
    const user = userEvent.setup()
    const props = renderPicker()

    await user.click(screen.getByRole('button', { name: 'Выбрать' }))

    expect(props.onSelect).toHaveBeenCalledWith('second')
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('выбирает центрированное scroll значение', async () => {
    const user = userEvent.setup()
    const props = renderPicker({ value: 'first' })
    const scroller = screen.getByText('Первый').parentElement!
    scroller.scrollTop = 60

    fireEvent.scroll(scroller)
    await user.click(screen.getByRole('button', { name: 'Выбрать' }))

    expect(props.onSelect).toHaveBeenCalledWith('third')
  })

  it('подкручивает выбранный ряд к центру', async () => {
    const user = userEvent.setup()
    renderPicker({ value: 'first' })
    const scroller = screen.getByText('Первый').parentElement!
    const scrollTo = vi.fn()
    Object.defineProperty(scroller, 'scrollTo', { configurable: true, value: scrollTo })

    await user.click(screen.getByText('Третий'))

    expect(scrollTo).toHaveBeenCalledWith({ top: 60, behavior: 'smooth' })
  })

  it('закрывается по backdrop и игнорирует click внутри sheet', () => {
    const props = renderPicker()
    const scroller = screen.getByText('Первый').parentElement!
    const sheet = scroller.parentElement!.parentElement!
    const backdrop = sheet.parentElement!

    fireEvent.click(sheet)
    expect(props.onClose).not.toHaveBeenCalled()

    fireEvent.click(backdrop)
    expect(props.onClose).toHaveBeenCalledOnce()
  })
})
