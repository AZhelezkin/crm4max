import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import Input from './Input'

describe('Input', () => {
  it('рендерит label', () => {
    render(<Input label="Имя" value="" onChange={() => {}} />)
    expect(screen.getByText('Имя')).toBeInTheDocument()
  })

  it('вызывает onChange с новым значением', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Input value="" onChange={onChange} placeholder="Введите текст" />)

    await user.type(screen.getByPlaceholderText('Введите текст'), 'П')

    expect(onChange).toHaveBeenCalledWith('П')
  })

  it('рендерит textarea при multiline=true', () => {
    render(<Input value="текст" onChange={() => {}} multiline />)
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })

  it('рендерит input при multiline=false по умолчанию', () => {
    render(<Input value="" onChange={() => {}} placeholder="test" />)
    expect(screen.getByPlaceholderText('test').tagName).toBe('INPUT')
  })

  it('отображает текущее значение', () => {
    render(<Input value="текущее значение" onChange={() => {}} placeholder="test" />)
    expect(screen.getByPlaceholderText('test')).toHaveValue('текущее значение')
  })
})
