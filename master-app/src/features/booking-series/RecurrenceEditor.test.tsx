import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import RecurrenceEditor from './RecurrenceEditor'
import type { BookingSeriesPreviewResponse, RecurrenceRule, SeriesWarning } from './types'

const finiteRule: RecurrenceRule = {
  startDate: '2026-08-17',
  endDate: '2026-08-31',
  intervalWeeks: 1,
  timezone: 'Europe/Moscow',
  slots: [{ dayOfWeek: 1, time: '10:00' }],
}

const bookingOverlapWarning: SeriesWarning = {
  type: 'BOOKING_OVERLAP',
  message: 'Время пересекается с другой записью',
}

function createPreview(overrides: Partial<BookingSeriesPreviewResponse> = {}): BookingSeriesPreviewResponse {
  return {
    occurrences: [{ date: '2026-08-17', time: '10:00', warnings: [] }],
    previewLimit: 12,
    estimatedTotalOccurrences: 3,
    materializationOccurrences: 3,
    warningsCount: 0,
    ...overrides,
  }
}

function renderEditor(overrides: Partial<ComponentProps<typeof RecurrenceEditor>> = {}) {
  const props: ComponentProps<typeof RecurrenceEditor> = {
    initialRule: finiteRule,
    onBack: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  }

  return {
    ...render(<RecurrenceEditor {...props} />),
    props,
    user: userEvent.setup(),
  }
}

describe('RecurrenceEditor', () => {
  it('показывает CTA после списка, а не поверх конфликтов', () => {
    const view = renderEditor()
    const button = screen.getByRole('button', { name: 'Продолжить' })
    const buttonContainer = button.parentElement
    const content = buttonContainer?.previousElementSibling

    expect(buttonContainer).not.toHaveStyle({ position: 'absolute' })
    expect(content).toHaveStyle({ paddingBottom: '32px' })
    view.unmount()
  })

  it('показывает local preview до получения authoritative preview и затем заменяет его', () => {
    const view = renderEditor()

    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByText('Конфликтов нет')).toBeInTheDocument()
    expect(screen.queryByText('16:30')).not.toBeInTheDocument()

    const authoritativePreview = createPreview({
      occurrences: [{ date: '2026-08-18', time: '16:30', warnings: [bookingOverlapWarning] }],
      estimatedTotalOccurrences: 1,
      materializationOccurrences: 1,
      warningsCount: 1,
    })
    view.rerender(<RecurrenceEditor {...view.props} preview={authoritativePreview} />)

    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByText('16:30')).toBeInTheDocument()
    expect(screen.getByText('Занятое время')).toBeInTheDocument()
  })

  it('скрывает старые authoritative preview и warnings после изменения draft', async () => {
    const preview = createPreview({
      occurrences: [{ date: '2026-08-17', time: '16:30', warnings: [bookingOverlapWarning] }],
      estimatedTotalOccurrences: 3,
      materializationOccurrences: 3,
      warningsCount: 1,
    })
    const onChange = vi.fn()
    const view = renderEditor({ preview, onChange })

    expect(screen.getByText('16:30')).toBeInTheDocument()
    expect(screen.getByText('Конфликты')).toBeInTheDocument()
    expect(screen.getByText('Занятое время')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Раз в две недели' }))

    expect(screen.queryByText('16:30')).not.toBeInTheDocument()
    expect(screen.getByText('Конфликтов нет')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({ ...finiteRule, intervalWeeks: 2 })
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeInTheDocument()
  })

  it('показывает preview error и не сохраняет invalid rule', async () => {
    const onSave = vi.fn()
    const invalidRule: RecurrenceRule = {
      ...finiteRule,
      slots: [{ dayOfWeek: 1, time: '' }],
    }
    const view = renderEditor({
      initialRule: invalidRule,
      errorMessage: 'Не удалось проверить расписание',
      showValidationInitially: true,
      onSave,
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось проверить расписание')
    expect(screen.getByText('Время должно быть в формате HH:mm')).toBeInTheDocument()
    const submitButton = screen.getByRole('button', { name: 'Продолжить' })
    expect(submitButton).toBeDisabled()

    await view.user.click(submitButton)

    expect(onSave).not.toHaveBeenCalled()
  })

  it('позволяет выбрать отдельное время для нового дня новым wheel picker', async () => {
    const onSave = vi.fn()
    const view = renderEditor({
      initialRule: {
        ...finiteRule,
        slots: [{ dayOfWeek: 1, time: '12:00' }],
      },
      onSave,
    })

    await view.user.click(screen.getByRole('button', { name: 'Ср' }))
    await view.user.click(screen.getByRole('button', { name: /Среда.*Выбрать время/ }))
    const hours = screen.getByRole('listbox', { name: 'Часы' })
    const minutes = screen.getByRole('listbox', { name: 'Минуты' })
    hours.scrollTop = 13 * 30
    minutes.scrollTop = 30
    fireEvent.scroll(hours)
    fireEvent.scroll(minutes)
    await view.user.click(screen.getByRole('button', { name: 'Выбрать' }))
    const submitButton = screen.getByRole('button', { name: 'Продолжить' })
    expect(submitButton).toBeEnabled()
    await view.user.click(submitButton)

    expect(onSave).toHaveBeenCalledWith({
      ...finiteRule,
      slots: [
        { dayOfWeek: 1, time: '12:00' },
        { dayOfWeek: 3, time: '13:15' },
      ],
    })
  })
})
