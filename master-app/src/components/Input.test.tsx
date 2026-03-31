import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Input from './Input'

describe('Input', () => {
  it('рендерит label', () => {
    render(<Input label="Имя" value="" onChange={() => {}} />)
    expect(screen.getByText('Имя')).toBeInTheDocument()
  })

  it('вызывает onChange с новым значением', () => {
    const onChange = vi.fn()
    render(<Input value="" onChange={onChange} placeholder="Введите текст" />)
    fireEvent.change(screen.getByPlaceholderText('Введите текст'), {
      target: { value: 'Привет' },
    })
    expect(onChange).toHaveBeenCalledWith('Привет')
  })

  it('рендерит textarea при multiline=true', () => {
    render(<Input value="текст" onChange={() => {}} multiline />)
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })

  it('рендерит input при multiline=false (по умолчанию)', () => {
    render(<Input value="" onChange={() => {}} placeholder="test" />)
    expect(screen.getByPlaceholderText('test').tagName).toBe('INPUT')
  })

  it('отображает текущее значение', () => {
    render(<Input value="текущее значение" onChange={() => {}} placeholder="test" />)
    expect(screen.getByPlaceholderText('test')).toHaveValue('текущее значение')
  })
})
