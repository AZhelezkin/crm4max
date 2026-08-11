import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
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
  it('показывает local preview до получения authoritative preview и затем заменяет его', () => {
    const view = renderEditor()

    expect(screen.getAllByText('10:00')).toHaveLength(3)
    expect(screen.queryByText('16:30')).not.toBeInTheDocument()
    expect(screen.queryByText(/Всего записей:/)).not.toBeInTheDocument()

    const authoritativePreview = createPreview({
      occurrences: [{ date: '2026-08-18', time: '16:30', warnings: [] }],
      estimatedTotalOccurrences: 1,
      materializationOccurrences: 1,
    })
    view.rerender(<RecurrenceEditor {...view.props} preview={authoritativePreview} />)

    expect(screen.queryByText('10:00')).not.toBeInTheDocument()
    expect(screen.getByText('16:30')).toBeInTheDocument()
    expect(screen.getByText('Всего записей: 1')).toBeInTheDocument()
  })

  it.each([
    {
      kind: 'finite',
      rule: finiteRule,
      preview: createPreview({
        occurrences: [
          { date: '2026-08-17', time: '10:00', warnings: [] },
          { date: '2026-08-24', time: '10:00', warnings: [] },
        ],
        estimatedTotalOccurrences: 8,
        materializationOccurrences: 6,
      }),
      expectedSummary: 'Всего записей: 8',
      expectedMaterialization: 'В ближайшие 90 дней: 6',
    },
    {
      kind: 'endless',
      rule: { ...finiteRule, endDate: null },
      preview: createPreview({
        occurrences: [
          { date: '2026-08-17', time: '10:00', warnings: [] },
          { date: '2026-08-24', time: '10:00', warnings: [] },
        ],
        estimatedTotalOccurrences: null,
        materializationOccurrences: 13,
      }),
      expectedSummary: 'Без даты окончания · показаны первые 2',
      expectedMaterialization: 'В ближайшие 90 дней: 13',
    },
  ])('показывает authoritative summary для $kind серии', ({ rule, preview, expectedSummary, expectedMaterialization }) => {
    renderEditor({ initialRule: rule, preview })

    expect(screen.getByText(expectedSummary)).toBeInTheDocument()
    expect(screen.getByText(expectedMaterialization)).toBeInTheDocument()
  })

  it('скрывает старые authoritative preview и warnings после изменения draft', async () => {
    const preview = createPreview({
      occurrences: [{ date: '2026-08-17', time: '16:30', warnings: [bookingOverlapWarning] }],
      estimatedTotalOccurrences: 3,
      materializationOccurrences: 3,
      warningsCount: 1,
    })
    const view = renderEditor({ preview, previewRequired: true })

    expect(screen.getByText('16:30')).toBeInTheDocument()
    expect(screen.getByText('Всего записей: 3')).toBeInTheDocument()
    expect(screen.getByText('Предупреждений: 1')).toBeInTheDocument()
    expect(screen.getByText('Есть предупреждения')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сохранить расписание' })).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Раз в две недели' }))

    expect(screen.queryByText('16:30')).not.toBeInTheDocument()
    expect(screen.queryByText('Всего записей: 3')).not.toBeInTheDocument()
    expect(screen.queryByText('Предупреждений: 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Есть предупреждения')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Проверить расписание' })).toBeInTheDocument()
  })

  it('показывает preview error и не сохраняет invalid rule', async () => {
    const onSave = vi.fn()
    const invalidRule: RecurrenceRule = {
      ...finiteRule,
      slots: [{ dayOfWeek: 1, time: '' }],
    }
    const view = renderEditor({
      initialRule: invalidRule,
      previewRequired: true,
      errorMessage: 'Не удалось проверить расписание',
      showValidationInitially: true,
      onSave,
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось проверить расписание')
    expect(screen.getByText('Время должно быть в формате HH:mm')).toBeInTheDocument()
    const submitButton = screen.getByRole('button', { name: 'Проверить расписание' })
    expect(submitButton).toBeDisabled()

    await view.user.click(submitButton)

    expect(onSave).not.toHaveBeenCalled()
  })

  it('не дублирует выбор времени и наследует время записи для нового дня', async () => {
    const onSave = vi.fn()
    const view = renderEditor({
      initialRule: {
        ...finiteRule,
        slots: [{ dayOfWeek: 1, time: '12:00' }],
      },
      onSave,
    })

    expect(screen.queryByText('Время')).not.toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Ср' }))
    const submitButton = screen.getByRole('button', { name: 'Сохранить расписание' })
    expect(submitButton).toBeEnabled()
    await view.user.click(submitButton)

    expect(onSave).toHaveBeenCalledWith({
      ...finiteRule,
      slots: [
        { dayOfWeek: 1, time: '12:00' },
        { dayOfWeek: 3, time: '12:00' },
      ],
    })
  })
})
