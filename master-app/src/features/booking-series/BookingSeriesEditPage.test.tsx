import { Route, Routes } from 'react-router-dom'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Mocked } from 'vitest'

import { renderAtRoute } from '@/test/render'

import BookingSeriesEditPage from './BookingSeriesEditPage'
import { BookingSeriesGatewayProvider } from './gateway'
import type { BookingSeriesGateway } from './gateway'
import type {
  BookingSeriesGetResponse,
  BookingSeriesPreviewChangeResponse,
  BookingSeriesStatus,
  BookingSeriesUpdateResponse,
  RecurrenceRule,
  SeriesWarning,
} from './types'

interface RecurrenceEditorMockProps {
  initialRule: RecurrenceRule
  title: string
  subtitle?: string
  templateContent?: React.ReactNode
  saveDisabled?: boolean
  onBack: () => void
  onSave: (rule: RecurrenceRule) => void | Promise<void>
}

vi.mock('./RecurrenceEditor', () => ({
  default: ({ initialRule, title, subtitle, templateContent, saveDisabled, onBack, onSave }: RecurrenceEditorMockProps) => (
    <div data-testid="recurrence-editor">
      <div>{title}</div>
      <div>{subtitle}</div>
      {templateContent}
      <div data-testid="editor-rule">{JSON.stringify(initialRule)}</div>
      <button type="button" disabled={saveDisabled} onClick={() => { void onSave({ ...initialRule, intervalWeeks: 2 }) }}>
        Отправить preview
      </button>
      <button type="button" onClick={onBack}>Назад из редактора</button>
    </div>
  ),
  WarningSummary: ({ warnings }: { warnings: SeriesWarning[] }) => <div>Предупреждений: {warnings.length}</div>,
}))

const warning: SeriesWarning = {
  type: 'BOOKING_OVERLAP',
  message: 'Время пересекается с другой записью',
}

function createGateway(): Mocked<BookingSeriesGateway> {
  return {
    preview: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    previewChange: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  } as Mocked<BookingSeriesGateway>
}

function createSeriesData({
  status = 'ACTIVE',
  version = 3,
}: {
  status?: BookingSeriesStatus
  version?: number
} = {}): BookingSeriesGetResponse {
  return {
    series: {
      id: 'series-1',
      status,
      version,
      timezone: 'Europe/Moscow',
      startDate: '2026-08-17',
      endDate: null,
      rule: {
        intervalWeeks: 1,
        slots: [{ dayOfWeek: 1, time: '14:00' }],
      },
      template: {
        client: {
          id: 'client-1',
          name: 'Ирина Клиентова',
          phone: null,
          photo: null,
          isMaxUser: true,
        },
        services: [{
          service: {
            id: 'service-1',
            name: 'Стрижка',
            duration: 60,
            price: 250_000,
            discountPercent: null,
            photo: null,
          },
          price: null,
          order: 0,
        }],
        totalPrice: null,
        durationMinutes: 60,
        clientAddress: null,
        notes: null,
        remind: true,
        color: null,
      },
      exceptionsCount: 0,
      manualActionCount: 0,
      manualActionBookings: [],
      nextOccurrence: {
        bookingId: 'next-booking',
        date: '2026-08-17',
        time: '14:00',
      },
    },
    bookings: [],
    nextCursor: null,
  }
}

function createPreview(
  warnings: SeriesWarning[] = [],
  version = 3,
): BookingSeriesPreviewChangeResponse {
  return {
    seriesId: 'series-1',
    version,
    result: {
      updated: 4,
      created: 2,
      superseded: 1,
      cancelled: 0,
      skipped: [],
      warnings,
    },
  }
}

function createUpdate(version = 4): BookingSeriesUpdateResponse {
  return {
    series: {
      id: 'series-1',
      status: 'ACTIVE',
      version,
    },
    result: {
      updated: 4,
      created: 2,
      superseded: 1,
      skipped: [],
      warnings: [],
    },
  }
}

function apiError({
  status,
  code,
  actualVersion,
  preview,
  message,
}: {
  status: number
  code: string
  actualVersion?: number
  preview?: BookingSeriesPreviewChangeResponse
  message?: string
}) {
  return {
    response: {
      status,
      data: {
        error: {
          code,
          message,
          details: actualVersion === undefined && preview === undefined ? undefined : { actualVersion, preview },
        },
      },
    },
  }
}

function renderPage(
  gateway: BookingSeriesGateway | undefined,
  route = '/booking-series/series-1/edit?scope=ALL',
  enabled = true,
) {
  return renderAtRoute(
    <BookingSeriesGatewayProvider enabled={enabled} gateway={gateway}>
      <Routes>
        <Route path="/booking-series/:seriesId/edit" element={<BookingSeriesEditPage />} />
        <Route path="/booking-series/:seriesId" element={<div>Карточка серии</div>} />
        <Route path="/bookings" element={<div>Список записей</div>} />
      </Routes>
    </BookingSeriesGatewayProvider>,
    { route },
  )
}

describe('BookingSeriesEditPage', () => {
  it.each([
    '/booking-series/series-1/edit',
    '/booking-series/series-1/edit?scope=SINGLE',
    '/booking-series/series-1/edit?scope=all',
    '/booking-series/series-1/edit?scope=THIS_AND_FUTURE',
    '/booking-series/series-1/edit?scope=THIS_AND_FUTURE&anchorBookingId=',
  ])('не превращает невалидный route target в ALL: %s', (route) => {
    const gateway = createGateway()

    renderPage(gateway, route)

    expect(screen.getByText('Некорректная область изменения')).toBeInTheDocument()
    expect(screen.queryByTestId('recurrence-editor')).not.toBeInTheDocument()
    expect(gateway.get).not.toHaveBeenCalled()
    expect(gateway.previewChange).not.toHaveBeenCalled()
    expect(gateway.update).not.toHaveBeenCalled()
  })

  it('явно показывает выключенное редактирование серий', () => {
    renderPage(undefined, '/booking-series/series-1/edit?scope=ALL', false)

    expect(screen.getByText('Редактирование серий недоступно')).toBeInTheDocument()
  })

  it('показывает loading до завершения GET', () => {
    const gateway = createGateway()
    gateway.get.mockReturnValue(new Promise(() => {}))

    renderPage(gateway)

    expect(screen.getByText('Загружаем серию…')).toBeInTheDocument()
  })

  it('различает not-found и обычную ошибку GET', async () => {
    const notFoundGateway = createGateway()
    notFoundGateway.get.mockRejectedValue(apiError({ status: 404, code: 'SERIES_NOT_FOUND' }))
    const notFoundView = renderPage(notFoundGateway)

    expect(await screen.findByText('Серия не найдена')).toBeInTheDocument()
    notFoundView.unmount()

    const failedGateway = createGateway()
    failedGateway.get.mockRejectedValue(apiError({ status: 500, code: 'INTERNAL_ERROR' }))
    renderPage(failedGateway)

    expect(await screen.findByText('Не удалось загрузить серию')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
  })

  it('показывает network state и повторяет GET', async () => {
    const gateway = createGateway()
    gateway.get
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(createSeriesData())
    const view = renderPage(gateway)

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByTestId('recurrence-editor')).toBeInTheDocument()
    expect(gateway.get).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['ENDED', 'Серия завершена'],
    ['CANCELLED', 'Серия отменена'],
  ] as const)('не открывает mutation UI для серии %s', async (status, title) => {
    const gateway = createGateway()
    gateway.get.mockResolvedValue(createSeriesData({ status }))

    renderPage(gateway)

    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.getByText('Изменить можно только активную серию')).toBeInTheDocument()
    expect(screen.queryByTestId('recurrence-editor')).not.toBeInTheDocument()
  })

  it('передаёт THIS_AND_FUTURE с anchor, показывает scope в editor/preview/result и различает подписи', async () => {
    const gateway = createGateway()
    gateway.get.mockResolvedValue(createSeriesData())
    gateway.previewChange.mockResolvedValue(createPreview())
    gateway.update.mockResolvedValue(createUpdate())
    const view = renderPage(
      gateway,
      '/booking-series/series-1/edit?scope=THIS_AND_FUTURE&anchorBookingId=anchor-1',
    )

    expect(await screen.findByText('Эта и следующие')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Отправить preview' }))

    await waitFor(() => expect(gateway.previewChange).toHaveBeenCalledTimes(1))
    expect(gateway.previewChange).toHaveBeenCalledWith('series-1', expect.objectContaining({
      expectedVersion: 3,
      operation: 'UPDATE',
      scope: 'THIS_AND_FUTURE',
      anchorBookingId: 'anchor-1',
      allowConflicts: false,
    }))
    expect(screen.getByText('Эта и следующие')).toBeInTheDocument()
    expect(screen.getByText('Будет обновлено')).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Применить изменения' }))

    await waitFor(() => expect(gateway.update).toHaveBeenCalledTimes(1))
    expect(gateway.update).toHaveBeenCalledWith('series-1', expect.objectContaining({
      expectedVersion: 3,
      scope: 'THIS_AND_FUTURE',
      anchorBookingId: 'anchor-1',
      allowConflicts: false,
    }))
    expect(await screen.findByText('Серия обновлена')).toBeInTheDocument()
    expect(screen.getByText('Эта и следующие')).toBeInTheDocument()
    expect(screen.getByText('Обновлено')).toBeInTheDocument()
    expect(screen.queryByText('Будет обновлено')).not.toBeInTheDocument()
  })

  it('при ALL не отправляет anchor из URL', async () => {
    const gateway = createGateway()
    gateway.get.mockResolvedValue(createSeriesData())
    gateway.previewChange.mockResolvedValue(createPreview())
    const view = renderPage(gateway, '/booking-series/series-1/edit?scope=ALL&anchorBookingId=ignored')

    expect(await screen.findByText('Вся серия')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Отправить preview' }))

    await waitFor(() => expect(gateway.previewChange).toHaveBeenCalledTimes(1))
    const request = gateway.previewChange.mock.calls[0][1]
    expect(request.scope).toBe('ALL')
    expect(request).not.toHaveProperty('anchorBookingId')
    expect(request).toMatchObject({ operation: 'UPDATE', allowConflicts: false })
  })

  it('отправляет изменения шаблона вместе с правилом в authoritative preview', async () => {
    const gateway = createGateway()
    gateway.get.mockResolvedValue(createSeriesData())
    gateway.previewChange.mockResolvedValue(createPreview())
    const view = renderPage(gateway)

    await screen.findByTestId('recurrence-editor')
    await view.user.type(screen.getByPlaceholderText('Адрес клиента'), 'Москва, Тверская, 1')
    await view.user.click(screen.getByRole('button', { name: 'Напоминать клиенту' }))
    await view.user.click(screen.getByRole('button', { name: 'Отправить preview' }))

    await waitFor(() => expect(gateway.previewChange).toHaveBeenCalledTimes(1))
    expect(gateway.previewChange.mock.calls[0][1]).toMatchObject({
      changes: {
        template: {
          services: [{ serviceId: 'service-1', price: null }],
          totalPrice: null,
          durationMinutes: 60,
          clientAddress: 'Москва, Тверская, 1',
          notes: null,
          remind: false,
          color: null,
        },
        rule: expect.objectContaining({ intervalWeeks: 2 }),
      },
    })
  })

  it('отправляет allowConflicts=true только после явного подтверждения preview с warnings', async () => {
    const gateway = createGateway()
    gateway.get.mockResolvedValue(createSeriesData())
    gateway.previewChange.mockResolvedValue(createPreview([warning]))
    gateway.update.mockResolvedValue(createUpdate())
    const view = renderPage(gateway)

    await view.user.click(await screen.findByRole('button', { name: 'Отправить preview' }))

    expect(await screen.findByText('Предупреждений: 1')).toBeInTheDocument()
    expect(gateway.update).not.toHaveBeenCalled()
    await view.user.click(screen.getByRole('button', { name: 'Применить всё равно' }))

    await waitFor(() => expect(gateway.update).toHaveBeenCalledTimes(1))
    expect(gateway.previewChange.mock.calls[0][1]).toMatchObject({ operation: 'UPDATE', allowConflicts: false })
    expect(gateway.update.mock.calls[0][1].allowConflicts).toBe(true)
  })

  it('показывает новый authoritative preview при SERIES_CONFLICTS и только затем разрешает true', async () => {
    const gateway = createGateway()
    const authoritativePreview = createPreview([warning])
    gateway.get.mockResolvedValue(createSeriesData())
    gateway.previewChange.mockResolvedValue(createPreview())
    gateway.update
      .mockRejectedValueOnce(apiError({
        status: 409,
        code: 'SERIES_CONFLICTS',
        preview: authoritativePreview,
      }))
      .mockResolvedValueOnce(createUpdate())
    const view = renderPage(gateway)

    await view.user.click(await screen.findByRole('button', { name: 'Отправить preview' }))
    await view.user.click(await screen.findByRole('button', { name: 'Применить изменения' }))

    expect(await screen.findByRole('button', { name: 'Применить всё равно' })).toBeInTheDocument()
    expect(gateway.update).toHaveBeenCalledTimes(1)
    expect(gateway.update.mock.calls[0][1].allowConflicts).toBe(false)

    await view.user.click(screen.getByRole('button', { name: 'Применить всё равно' }))

    await waitFor(() => expect(gateway.update).toHaveBeenCalledTimes(2))
    expect(gateway.update.mock.calls[1][1].allowConflicts).toBe(true)
  })

  it('сохраняет draft и после version conflict preview обновляет GET/version до нового preview', async () => {
    const gateway = createGateway()
    gateway.get
      .mockResolvedValueOnce(createSeriesData({ version: 3 }))
      .mockResolvedValueOnce(createSeriesData({ version: 7 }))
    gateway.previewChange
      .mockRejectedValueOnce(apiError({ status: 409, code: 'SERIES_VERSION_CONFLICT', actualVersion: 7 }))
      .mockResolvedValueOnce(createPreview([], 7))
    const view = renderPage(gateway)

    await view.user.click(await screen.findByRole('button', { name: 'Отправить preview' }))

    const dialog = await screen.findByRole('dialog', { name: 'Серия уже изменилась' })
    expect(dialog).toHaveTextContent('Актуальная версия: 7')
    expect(screen.getByTestId('editor-rule')).toHaveTextContent('"intervalWeeks":2')
    await view.user.click(within(dialog).getByRole('button', { name: 'Обновить серию' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Серия уже изменилась' })).not.toBeInTheDocument())
    expect(gateway.get).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('editor-rule')).toHaveTextContent('"intervalWeeks":2')
    expect(screen.queryByText('Будет обновлено')).not.toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Отправить preview' }))

    await waitFor(() => expect(gateway.previewChange).toHaveBeenCalledTimes(2))
    expect(gateway.previewChange.mock.calls[1][1].expectedVersion).toBe(7)
  })

  it('показывает apply version conflict поверх preview и после refresh требует новый preview', async () => {
    const gateway = createGateway()
    gateway.get
      .mockResolvedValueOnce(createSeriesData({ version: 3 }))
      .mockResolvedValueOnce(createSeriesData({ version: 8 }))
    gateway.previewChange.mockResolvedValue(createPreview())
    gateway.update.mockRejectedValue(apiError({ status: 409, code: 'SERIES_VERSION_CONFLICT', actualVersion: 8 }))
    const view = renderPage(gateway)

    await view.user.click(await screen.findByRole('button', { name: 'Отправить preview' }))
    await view.user.click(await screen.findByRole('button', { name: 'Применить изменения' }))

    const dialog = await screen.findByRole('dialog', { name: 'Серия уже изменилась' })
    expect(screen.getByText('Будет обновлено')).toBeInTheDocument()
    await view.user.click(within(dialog).getByRole('button', { name: 'Обновить серию' }))

    expect(await screen.findByTestId('recurrence-editor')).toBeInTheDocument()
    expect(screen.queryByText('Будет обновлено')).not.toBeInTheDocument()
    expect(gateway.update).toHaveBeenCalledTimes(1)

    await view.user.click(screen.getByRole('button', { name: 'Отправить preview' }))

    await waitFor(() => expect(gateway.previewChange).toHaveBeenCalledTimes(2))
    expect(gateway.previewChange.mock.calls[1][1].expectedVersion).toBe(8)
  })

  it('показывает preview/apply mutation errors с retry и back', async () => {
    const gateway = createGateway()
    gateway.get.mockResolvedValue(createSeriesData())
    gateway.previewChange
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(createPreview())
    gateway.update.mockRejectedValue(apiError({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Сервис временно недоступен',
    }))
    const view = renderPage(gateway)

    await view.user.click(await screen.findByRole('button', { name: 'Отправить preview' }))

    const previewError = await screen.findByRole('alertdialog', { name: 'Не удалось проверить изменения' })
    expect(previewError).toHaveTextContent('Нет связи с сервером')
    expect(within(previewError).getByRole('button', { name: 'Назад' })).toBeInTheDocument()
    await view.user.click(within(previewError).getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('Будет обновлено')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Применить изменения' }))

    const applyError = await screen.findByRole('alertdialog', { name: 'Не удалось обновить серию' })
    expect(applyError).toHaveTextContent('Сервис временно недоступен')
    expect(within(applyError).getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
    await view.user.click(within(applyError).getByRole('button', { name: 'Назад' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByText('Будет обновлено')).toBeInTheDocument()
  })
})
