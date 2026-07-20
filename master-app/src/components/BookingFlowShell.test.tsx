import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  BookingFlowBottomButton,
  BookingFlowPillButton,
  BookingFlowToolbar,
  CloseIcon,
} from './BookingFlowShell'

describe('BookingFlowShell', () => {
  it('рендерит toolbar copy, accessible back action и trailing content', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    render(
      <BookingFlowToolbar
        title="Выберите время"
        subtitle="21 июля"
        onBack={onBack}
        backIcon={<CloseIcon />}
        backAriaLabel="Закрыть"
        trailing={<span>Фильтр</span>}
      />,
    )

    expect(screen.getByText('Выберите время')).toBeInTheDocument()
    expect(screen.getByText('21 июля')).toBeInTheDocument()
    expect(screen.getByText('Фильтр')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Закрыть' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('использует default back accessible name', () => {
    render(
      <BookingFlowToolbar
        onBack={() => {}}
        backIcon={<span>←</span>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Назад' })).toBeInTheDocument()
  })

  it('вызывает pill action по accessible name', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <BookingFlowPillButton onClick={onClick} ariaLabel="Поиск">
        <span>⌕</span>
      </BookingFlowPillButton>,
    )

    await user.click(screen.getByRole('button', { name: 'Поиск' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('рендерит enabled bottom action с icon', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <BookingFlowBottomButton onClick={onClick} icon={<span data-testid="action-icon">+</span>}>
        Продолжить
      </BookingFlowBottomButton>,
    )

    const button = screen.getByRole('button', { name: '+ Продолжить' })
    expect(button).toBeEnabled()
    expect(screen.getByTestId('action-icon')).toBeInTheDocument()
    await user.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('не вызывает disabled bottom action', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <BookingFlowBottomButton disabled onClick={onClick}>
        Продолжить
      </BookingFlowBottomButton>,
    )

    const button = screen.getByRole('button', { name: 'Продолжить' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
