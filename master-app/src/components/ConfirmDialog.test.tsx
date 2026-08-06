import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Удалить клиента?')
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Это действие нельзя отменить')
    expect(screen.getByText('Удалить клиента?')).toHaveStyle({
      fontSize: '20px',
      lineHeight: '24px',
      fontWeight: '700',
    })
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

  it('busy блокирует double click, cancel и backdrop', async () => {
    const user = userEvent.setup()
    const props = renderDialog({ busy: true })
    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    fireEvent.click(dialog.parentElement!)

    expect(props.onConfirm).not.toHaveBeenCalled()
    expect(props.onCancel).not.toHaveBeenCalled()
  })

  it('удерживает keyboard focus внутри и возвращает его после закрытия', async () => {
    const user = userEvent.setup()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const props = {
      title: 'Удалить клиента?',
      message: 'Это действие нельзя отменить',
      confirmLabel: 'Удалить',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    }
    const view = render(<ConfirmDialog {...props} />)
    const confirm = screen.getByRole('button', { name: 'Удалить' })
    const cancel = screen.getByRole('button', { name: 'Отмена' })

    await waitFor(() => expect(cancel).toHaveFocus())
    await user.tab()
    expect(confirm).toHaveFocus()
    await user.tab({ shift: true })
    expect(cancel).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(props.onCancel).toHaveBeenCalledOnce()

    view.unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})
