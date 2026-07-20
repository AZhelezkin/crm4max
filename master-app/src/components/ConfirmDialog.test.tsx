import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ConfirmDialog from './ConfirmDialog'

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const props = {
    title: 'Удалить клиента?',
    message: 'Это действие нельзя отменить',
    confirmLabel: 'Удалить',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
  render(<ConfirmDialog {...props} />)
  return props
}

describe('ConfirmDialog', () => {
  it('рендерит copy и default cancel label в portal', () => {
    renderDialog()

    expect(screen.getByText('Удалить клиента?')).toBeInTheDocument()
    expect(screen.getByText('Это действие нельзя отменить')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeInTheDocument()
  })

  it('вызывает confirm и cancel actions', async () => {
    const user = userEvent.setup()
    const props = renderDialog({ cancelLabel: 'Оставить' })

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await user.click(screen.getByRole('button', { name: 'Оставить' }))

    expect(props.onConfirm).toHaveBeenCalledOnce()
    expect(props.onCancel).toHaveBeenCalledOnce()
  })

  it('закрывается по backdrop, но не по dialog content', () => {
    const props = renderDialog()
    const content = screen.getByText('Удалить клиента?').parentElement!
    const backdrop = content.parentElement!

    fireEvent.click(content)
    expect(props.onCancel).not.toHaveBeenCalled()

    fireEvent.click(backdrop)
    expect(props.onCancel).toHaveBeenCalledOnce()
  })

  it('поддерживает primary non-danger confirm', () => {
    renderDialog({ danger: false, confirmLabel: 'Продолжить' })

    expect(screen.getByRole('button', { name: 'Продолжить' })).toHaveStyle({
      background: 'var(--color-primary-surface)',
    })
  })
})
