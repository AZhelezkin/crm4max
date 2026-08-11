import { Route, Routes } from 'react-router-dom'
import { act, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterBooking } from '@/test/fixtures/bookings'
import { createMasterService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'
import type { Booking } from '@/types'

import BookingSeriesDetailPage from './BookingSeriesDetailPage'
import { BookingSeriesGatewayProvider } from './gateway'
import type { BookingSeriesGateway } from './gateway'
import type {
  BookingSeriesBookingReadModel,
  BookingSeriesGetResponse,
  BookingSeriesManualActionBooking,
  BookingSeriesNextOccurrence,
  BookingSeriesStatus,
} from './types'

const SERIES_ID = 'series-detail'

const gateway = {
  preview: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  previewChange: vi.fn(),
  update: vi.fn(),
  cancel: vi.fn(),
} satisfies BookingSeriesGateway

function createOccurrence(
  id: string,
  status: Booking['status'] = 'CONFIRMED',
  seriesId = SERIES_ID,
  version = 7,
): BookingSeriesBookingReadModel {
  return {
    ...createMasterBooking({ id, status }),
    series: {
      id: seriesId,
      status: 'ACTIVE',
      version,
      isException: false,
      originalDate: '2026-08-17',
      originalTime: '14:00',
      summary: 'Каждую неделю · Пн 14:00',
    },
  }
}

function createSeriesData({
  status = 'ACTIVE',
  version = 7,
  nextOccurrence,
  bookings,
  manualActionBookings = [],
}: {
  status?: BookingSeriesStatus
  version?: number
  nextOccurrence?: BookingSeriesNextOccurrence | null
  bookings?: BookingSeriesBookingReadModel[]
  manualActionBookings?: BookingSeriesManualActionBooking[]
} = {}): BookingSeriesGetResponse {
  const service = createMasterService()
  return {
    series: {
      id: SERIES_ID,
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
          id: 'client-detail',
          name: 'Ирина Клиентова',
          phone: '+79990000002',
          photo: null,
          isMaxUser: true,
        },
        services: [{
          service: {
            id: service.id,
            name: service.name,
            duration: service.duration,
            price: service.price,
            discountPercent: service.discountPercent,
            photo: service.photo,
          },
          price: null,
          order: 0,
        }],
        totalPrice: null,
        durationMinutes: service.duration,
        clientAddress: null,
        notes: null,
        remind: true,
        color: null,
      },
      exceptionsCount: 0,
      manualActionCount: manualActionBookings.length,
      manualActionBookings,
      nextOccurrence: nextOccurrence === undefined
        ? { bookingId: 'next-booking', date: '2026-08-17', time: '14:00' }
        : nextOccurrence,
    },
    bookings: bookings ?? [createOccurrence('next-booking', 'CONFIRMED', SERIES_ID, version)],
    nextCursor: null,
  }
}

function previewResponse(version: number, cancelled: number, skipped: { bookingId: string; reason: 'LOCAL_EXCEPTION' | 'PAYMENT_REQUIRES_MANUAL_ACTION' }[] = []) {
  return {
    seriesId: SERIES_ID,
    version,
    result: {
      updated: 0,
      created: 0,
      superseded: 0,
      cancelled,
      skipped,
      warnings: [],
    },
  }
}

function renderPage() {
  return renderAtRoute(
    <BookingSeriesGatewayProvider enabled gateway={gateway}>
      <Routes>
        <Route path="/booking-series/:seriesId" element={<BookingSeriesDetailPage />} />
        <Route path="/bookings/:bookingId" element={<div>Карточка пропущенной записи</div>} />
      </Routes>
    </BookingSeriesGatewayProvider>,
    { route: `/booking-series/${SERIES_ID}` },
  )
}

describe('BookingSeriesDetailPage read side', () => {
  beforeEach(() => {
    Object.values(gateway).forEach((method) => method.mockReset())
  })

  it('показывает exceptionsCount, сортирует слоты и услуги, учитывая скидку каталога', async () => {
    const data = createSeriesData()
    const service = data.series.template.services[0].service
    data.series.exceptionsCount = 2
    data.series.rule.slots = [
      { dayOfWeek: 5, time: '16:00' },
      { dayOfWeek: 1, time: '15:00' },
      { dayOfWeek: 1, time: '09:00' },
    ]
    data.series.template.services = [
      {
        service: { ...service, id: 'service-second', name: 'Вторая услуга', price: 200_000, discountPercent: 25 },
        price: null,
        order: 2,
      },
      {
        service: { ...service, id: 'service-first', name: 'Первая услуга', price: 100_000, discountPercent: 10 },
        price: null,
        order: 1,
      },
    ]
    gateway.get.mockResolvedValue(data)

    renderPage()

    expect(await screen.findByText('Изменено отдельно: 2')).toBeInTheDocument()
    expect(screen.getByText('Каждую неделю · Пн 09:00, Пн 15:00, Пт 16:00')).toBeInTheDocument()
    const firstService = screen.getByText('Первая услуга')
    const secondService = screen.getByText('Вторая услуга')
    expect(firstService.compareDocumentPosition(secondService) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(screen.getByText('900 ₽')).toBeInTheDocument()
    expect(screen.getByText(/1.500 ₽/)).toBeInTheDocument()
    expect(screen.getByText(/2.400 ₽/)).toBeInTheDocument()
  })

  it('подписывает отменённое исключение как отменённую запись', async () => {
    const booking = createOccurrence('cancelled-exception', 'CANCELLED')
    booking.series.isException = true
    gateway.get.mockResolvedValue(createSeriesData({ bookings: [booking] }))

    renderPage()

    const bookingLink = await screen.findByRole('button', { name: /Отменена/ })
    expect(within(bookingLink).getByText('Отменена')).toBeInTheDocument()
    expect(within(bookingLink).queryByText('Изменена отдельно')).not.toBeInTheDocument()
  })

  it('добавляет следующую страницу без дублей, обновляет cursor и сохраняет ссылки', async () => {
    const firstBooking = createOccurrence('booking-first')
    firstBooking.date = '2026-08-18'
    const appendedBooking = createOccurrence('booking-appended')
    appendedBooking.date = '2026-08-25'
    appendedBooking.time = '11:30'
    const manualActionBookings: BookingSeriesManualActionBooking[] = [{
      bookingId: 'booking-manual',
      date: '2026-08-19',
      time: '13:00',
      paymentStatus: 'PAID',
      reason: 'PAYMENT_REQUIRES_MANUAL_ACTION',
    }]
    const firstPage = createSeriesData({ bookings: [firstBooking], manualActionBookings })
    firstPage.nextCursor = 'cursor-first'
    const secondPage = createSeriesData({ bookings: [firstBooking, appendedBooking] })
    gateway.get.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage)
    const view = renderPage()

    expect(await screen.findByText('18 августа')).toBeInTheDocument()
    expect(gateway.get).toHaveBeenNthCalledWith(1, SERIES_ID, { limit: 30 })

    await view.user.click(screen.getByRole('button', { name: 'Показать ещё' }))

    expect(await screen.findByText('25 августа')).toBeInTheDocument()
    expect(gateway.get).toHaveBeenNthCalledWith(2, SERIES_ID, { cursor: 'cursor-first', limit: 30 })
    expect(screen.getAllByText('18 августа')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '19 августа, 13:00' })).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: /25 августа/ }))
    expect(view.getLocation().pathname).toBe('/bookings/booking-appended')
  })

  it('показывает loading и retry догрузки, не теряя данные при неизвестной ошибке', async () => {
    const firstBooking = createOccurrence('booking-first')
    firstBooking.date = '2026-08-18'
    const appendedBooking = createOccurrence('booking-appended')
    appendedBooking.date = '2026-08-25'
    const firstPage = createSeriesData({ bookings: [firstBooking] })
    firstPage.nextCursor = 'cursor-retry'
    const retryPage = createSeriesData({ bookings: [appendedBooking] })
    let rejectPage!: (reason?: unknown) => void
    const pendingPage = new Promise<BookingSeriesGetResponse>((_resolve, reject) => {
      rejectPage = reject
    })
    gateway.get
      .mockResolvedValueOnce(firstPage)
      .mockReturnValueOnce(pendingPage)
      .mockResolvedValueOnce(retryPage)
    const view = renderPage()

    await view.user.click(await screen.findByRole('button', { name: 'Показать ещё' }))
    expect(await screen.findByRole('button', { name: 'Загружаем…' })).toBeDisabled()

    await act(async () => {
      rejectPage({ unexpected: true })
      await pendingPage.catch(() => undefined)
    })

    const errorState = await screen.findByRole('alert')
    expect(within(errorState).getByText('Не удалось загрузить ещё записи')).toBeInTheDocument()
    expect(screen.getByText('18 августа')).toBeInTheDocument()

    await view.user.click(within(errorState).getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('25 августа')).toBeInTheDocument()
    expect(screen.getByText('18 августа')).toBeInTheDocument()
    expect(gateway.get).toHaveBeenNthCalledWith(3, SERIES_ID, { cursor: 'cursor-retry', limit: 30 })
  })

  it('повторяет первоначальную загрузку после неизвестной ошибки', async () => {
    gateway.get
      .mockRejectedValueOnce(null)
      .mockResolvedValueOnce(createSeriesData())
    const view = renderPage()

    expect(await screen.findByText('Не удалось загрузить серию')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('Ирина Клиентова')).toBeInTheDocument()
    expect(gateway.get).toHaveBeenNthCalledWith(2, SERIES_ID, { limit: 30 })
  })

  it('сохраняет переход из списка записей с отдельной обработкой', async () => {
    gateway.get.mockResolvedValue(createSeriesData({
      manualActionBookings: [{
        bookingId: 'booking-manual',
        date: '2026-08-19',
        time: '13:00',
        paymentStatus: 'DEPOSIT_PAID',
        reason: 'PAYMENT_REQUIRES_MANUAL_ACTION',
      }],
    }))
    const view = renderPage()

    await view.user.click(await screen.findByRole('button', { name: '19 августа, 13:00' }))

    expect(view.getLocation().pathname).toBe('/bookings/booking-manual')
  })
})

describe('BookingSeriesDetailPage cancellation flow', () => {
  beforeEach(() => {
    Object.values(gateway).forEach((method) => method.mockReset())
  })

  it('завершает с nextOccurrence только после authoritative preview и ConfirmDialog', async () => {
    const data = createSeriesData({
      bookings: [
        createOccurrence('next-booking'),
        createOccurrence('paid-booking'),
        createOccurrence('exception-booking'),
      ],
    })
    gateway.get.mockResolvedValue(data)
    gateway.previewChange.mockResolvedValue(previewResponse(7, 3, [
      { bookingId: 'paid-booking', reason: 'PAYMENT_REQUIRES_MANUAL_ACTION' },
      { bookingId: 'exception-booking', reason: 'LOCAL_EXCEPTION' },
    ]))
    gateway.cancel.mockResolvedValue({
      series: { id: SERIES_ID, status: 'ENDED', version: 8 },
      result: {
        cancelled: 2,
        skipped: [
          { bookingId: 'paid-booking', reason: 'PAYMENT_REQUIRES_MANUAL_ACTION' },
          { bookingId: 'exception-booking', reason: 'LOCAL_EXCEPTION' },
        ],
      },
    })
    const view = renderPage()

    await view.user.click(await screen.findByRole('button', { name: 'Завершить с ближайшей записи' }))

    await waitFor(() => expect(gateway.previewChange).toHaveBeenCalledWith(SERIES_ID, {
      operation: 'CANCEL',
      scope: 'THIS_AND_FUTURE',
      anchorBookingId: 'next-booking',
      expectedVersion: 7,
    }))
    expect(gateway.cancel).not.toHaveBeenCalled()
    expect(await screen.findByText(/Будет отменено записей: 3\. Пропущено: 2\./)).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Подтвердить завершение' }))

    await waitFor(() => expect(gateway.cancel).toHaveBeenCalledWith('next-booking', {
      scope: 'THIS_AND_FUTURE',
      expectedSeriesVersion: 7,
    }))
    expect(await screen.findByText('Отмена серии выполнена')).toBeInTheDocument()
    expect(screen.getByText('Отменено: 2')).toBeInTheDocument()
    expect(screen.getByText('Пропущено: 2')).toBeInTheDocument()
    expect(screen.getByText(/требуется обработать оплату/)).toBeInTheDocument()
    expect(screen.getByText(/изменены отдельно/)).toBeInTheDocument()
    expect(screen.getByText('ЗАВЕРШЕНА')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Отменить серию' })).not.toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Открыть запись paid-booking' }))
    expect(view.getLocation().pathname).toBe('/bookings/paid-booking')
  })

  it('для ALL берёт первую активную запись read-model и не передаёт anchor в preview', async () => {
    gateway.get.mockResolvedValue(createSeriesData({
      nextOccurrence: null,
      bookings: [
        createOccurrence('completed-booking', 'COMPLETED'),
        createOccurrence('fallback-booking'),
      ],
    }))
    gateway.previewChange.mockResolvedValue(previewResponse(7, 1))
    gateway.cancel.mockResolvedValue({
      series: { id: SERIES_ID, status: 'CANCELLED', version: 8 },
      result: { cancelled: 1, skipped: [] },
    })
    const view = renderPage()

    await view.user.click(await screen.findByRole('button', { name: 'Отменить серию' }))

    await waitFor(() => expect(gateway.previewChange).toHaveBeenCalledWith(SERIES_ID, {
      operation: 'CANCEL',
      scope: 'ALL',
      expectedVersion: 7,
    }))
    expect(gateway.cancel).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Подтвердить отмену' }))

    await waitFor(() => expect(gateway.cancel).toHaveBeenCalledWith('fallback-booking', {
      scope: 'ALL',
      expectedSeriesVersion: 7,
    }))
    expect(gateway.cancel).not.toHaveBeenCalledWith('', expect.anything())
  })

  it('без anchor безопасно блокирует обе batch-cancel кнопки', async () => {
    gateway.get.mockResolvedValue(createSeriesData({ nextOccurrence: null, bookings: [] }))
    renderPage()

    expect(await screen.findByRole('button', { name: 'Завершить с ближайшей записи' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Отменить серию' })).toBeDisabled()
    expect(gateway.previewChange).not.toHaveBeenCalled()
    expect(gateway.cancel).not.toHaveBeenCalled()
  })

  it.each<BookingSeriesStatus>(['ENDED', 'CANCELLED'])('оставляет серию %s read-only', async (status) => {
    gateway.get.mockResolvedValue(createSeriesData({ status }))
    renderPage()

    await screen.findByText(status === 'ENDED' ? 'ЗАВЕРШЕНА' : 'ОТМЕНЕНА')
    expect(screen.queryByRole('button', { name: 'Изменить серию' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Завершить с ближайшей записи' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Отменить серию' })).not.toBeInTheDocument()
  })

  it('показывает network preview error и повторяет preview без потери scope', async () => {
    gateway.get.mockResolvedValue(createSeriesData())
    gateway.previewChange
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(previewResponse(7, 1))
    const view = renderPage()

    await view.user.click(await screen.findByRole('button', { name: 'Завершить с ближайшей записи' }))

    expect(await screen.findByText('Не удалось проверить отмену')).toBeInTheDocument()
    expect(screen.getByText(/Контекст действия сохранён/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Вернуться к серии' })).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Повторить' }))

    await waitFor(() => expect(gateway.previewChange).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('button', { name: 'Подтвердить завершение' })).toBeInTheDocument()
    expect(gateway.previewChange).toHaveBeenLastCalledWith(SERIES_ID, {
      operation: 'CANCEL',
      scope: 'THIS_AND_FUTURE',
      anchorBookingId: 'next-booking',
      expectedVersion: 7,
    })
  })

  it('при version conflict cancel перечитывает серию и заново делает preview перед retry', async () => {
    const initial = createSeriesData()
    const refreshed = createSeriesData({
      version: 8,
      nextOccurrence: { bookingId: 'refreshed-next', date: '2026-08-24', time: '14:00' },
      bookings: [createOccurrence('refreshed-next', 'CONFIRMED', SERIES_ID, 8)],
    })
    gateway.get.mockResolvedValueOnce(initial).mockResolvedValueOnce(refreshed)
    gateway.previewChange
      .mockResolvedValueOnce(previewResponse(7, 1))
      .mockResolvedValueOnce(previewResponse(8, 1))
    gateway.cancel
      .mockRejectedValueOnce({
        response: {
          data: {
            error: {
              code: 'SERIES_VERSION_CONFLICT',
              details: { actualVersion: 8 },
            },
          },
        },
      })
      .mockResolvedValueOnce({
        series: { id: SERIES_ID, status: 'ENDED', version: 9 },
        result: { cancelled: 1, skipped: [] },
      })
    const view = renderPage()

    await view.user.click(await screen.findByRole('button', { name: 'Завершить с ближайшей записи' }))
    await view.user.click(await screen.findByRole('button', { name: 'Подтвердить завершение' }))

    expect(await screen.findByText('Серия уже изменилась')).toBeInTheDocument()
    expect(screen.getByText(/Актуальная версия: 8/)).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Обновить и повторить' }))

    await waitFor(() => expect(gateway.get).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(gateway.previewChange).toHaveBeenLastCalledWith(SERIES_ID, {
      operation: 'CANCEL',
      scope: 'THIS_AND_FUTURE',
      anchorBookingId: 'refreshed-next',
      expectedVersion: 8,
    }))
    await view.user.click(await screen.findByRole('button', { name: 'Подтвердить завершение' }))

    await waitFor(() => expect(gateway.cancel).toHaveBeenLastCalledWith('refreshed-next', {
      scope: 'THIS_AND_FUTURE',
      expectedSeriesVersion: 8,
    }))
    expect(await screen.findByText('Отмена серии выполнена')).toBeInTheDocument()
  })
})
