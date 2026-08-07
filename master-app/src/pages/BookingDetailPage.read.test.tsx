import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterBooking } from '@/test/fixtures/bookings'
import { createMasterService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  confirmPayment: vi.fn(),
  cancel: vi.fn(),
  openAddToCalendar: vi.fn(),
}))

vi.mock('@/api/bookings.api', () => ({
  bookingsApi: {
    getById: mocks.getById,
    confirmPayment: mocks.confirmPayment,
    cancel: mocks.cancel,
  },
}))
vi.mock('@/lib/calendar', () => ({ openAddToCalendar: mocks.openAddToCalendar }))

import BookingDetailPage from './BookingDetailPage'

function renderPage(id = 'booking-detail') {
  return renderAtRoute(
    <Routes>
      <Route path="/bookings/:id" element={<BookingDetailPage />} />
    </Routes>,
    { route: `/bookings/${id}` },
  )
}

describe('master BookingDetailPage read state', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
  })

  it('остаётся пустым пока authoritative booking загружается', () => {
    mocks.getById.mockReturnValue(new Promise(() => {}))
    const view = renderPage('pending-booking')

    expect(view.container).toBeEmptyDOMElement()
    expect(mocks.getById).toHaveBeenCalledWith('pending-booking')
  })

  it('сохраняет текущий пустой not-found state', async () => {
    mocks.getById.mockResolvedValue(null)
    const view = renderPage('missing-booking')

    await waitFor(() => expect(mocks.getById).toHaveBeenCalledWith('missing-booking'))
    expect(view.container).toBeEmptyDOMElement()
  })

  it('сохраняет текущий пустой error state', async () => {
    mocks.getById.mockRejectedValue(new Error('booking unavailable'))
    const view = renderPage('failed-booking')

    await waitFor(() => expect(mocks.getById).toHaveBeenCalledWith('failed-booking'))
    expect(view.container).toBeEmptyDOMElement()
  })

  it('показывает authoritative fields и не выполняет mutation на render', async () => {
    const primary = createMasterService({ id: 'service-primary', name: 'Стрижка', price: 200_000 })
    const secondary = createMasterService({ id: 'service-secondary', name: 'Укладка', price: 100_000 })
    mocks.getById.mockResolvedValue(createMasterBooking({
      id: 'booking-fields',
      paymentStatus: 'DEPOSIT_PAID',
      date: '2026-07-21',
      time: '14:30',
      clientAddress: 'Москва, Клиентская улица, 10',
      client: {
        id: 'client-1',
        name: 'Ирина Клиентова',
        phone: '+79991234567',
        photo: null,
      },
      service: primary,
      services: [
        { id: 'item-1', service: primary, price: null, order: 0 },
        { id: 'item-2', service: secondary, price: 120_000, order: 1 },
      ],
    }))
    renderPage('booking-fields')

    expect(await screen.findByText('Ирина Клиентова')).toBeInTheDocument()
    expect(screen.getByText('+7 (999) 123-45-67')).toBeInTheDocument()
    expect(screen.getByText('Стрижка')).toBeInTheDocument()
    expect(screen.getByText('Укладка')).toBeInTheDocument()
    expect(screen.getByText(/3.?200 ₽/)).toBeInTheDocument()
    expect(screen.getByText('ДЕПОЗИТ')).toBeInTheDocument()
    expect(screen.getByText('Москва, Клиентская улица, 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отметить как оплачено' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Перенести/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Отменить/ })).toBeInTheDocument()
    expect(mocks.confirmPayment).not.toHaveBeenCalled()
    expect(mocks.cancel).not.toHaveBeenCalled()
  })

  it('открывает автомобильный маршрут от мастера к адресу клиента через provider bridge', async () => {
    const webApp = installWebApp()
    mocks.getById.mockResolvedValue(createMasterBooking({
      clientAddress: 'Москва, Клиентская улица, 10',
    }))
    const view = renderPage()

    await view.user.click(await screen.findByRole('button', { name: 'Построить маршрут' }))

    const route = new URL(webApp.openLink.mock.calls[0]?.[0] as string)
    expect(route.origin + route.pathname).toBe('https://yandex.ru/maps/')
    expect(route.searchParams.get('mode')).toBe('routes')
    expect(route.searchParams.get('rtext')).toBe('Москва, Тестовая улица, 1~Москва, Клиентская улица, 10')
    expect(route.searchParams.get('rtt')).toBe('auto')
    expect(mocks.confirmPayment).not.toHaveBeenCalled()
    expect(mocks.cancel).not.toHaveBeenCalled()
  })

  it('показывает и открывает ссылку онлайн-встречи', async () => {
    const webApp = installWebApp()
    const link = 'https://meet.example.com/room'
    mocks.getById.mockResolvedValue(createMasterBooking({ onlineMeetingLink: link }))
    const view = renderPage()

    await view.user.click(await screen.findByRole('button', { name: 'Открыть ссылку на онлайн-встречу' }))

    expect(screen.getByText(link)).toBeInTheDocument()
    expect(screen.getByText('Онлайн')).toBeInTheDocument()
    expect(webApp.openLink).toHaveBeenCalledWith(link)
  })

  it('показывает адрес, квартиру, комментарий, этаж и домофон отдельными строками', async () => {
    mocks.getById.mockResolvedValue(createMasterBooking({
      clientAddress: 'Москва, Серебряническая набережная, 29\nэтаж 7, кв./офис 104, домофон 123#\nСлева у входа есть подвал. Там справа будет окно',
    }))
    renderPage()

    expect(await screen.findByText('Москва, Серебряническая набережная, 29')).toBeInTheDocument()
    expect(screen.getByText('кв. 104')).toBeInTheDocument()
    expect(screen.getByText('Слева у входа есть подвал. Там справа будет окно')).toBeInTheDocument()
    expect(screen.getByText('7 этаж, домофон 123#')).toBeInTheDocument()
  })

  it('передаёт exact reschedule и edit-time route state', async () => {
    const booking = createMasterBooking({ id: 'booking-route', date: '2026-08-05' })
    mocks.getById.mockResolvedValue(booking)
    const reschedule = renderPage('booking-route')
    await reschedule.user.click(await screen.findByRole('button', { name: 'Изменить дату' }))
    expect(reschedule.getLocation().pathname).toBe('/bookings/new')
    expect(reschedule.getLocation().state).toEqual({
      rescheduleId: 'booking-route',
      serviceId: booking.service.id,
    })
    reschedule.unmount()

    mocks.getById.mockResolvedValue(booking)
    const editTime = renderPage('booking-route')
    await editTime.user.click(await screen.findByRole('button', { name: 'Изменить время' }))
    expect(editTime.getLocation().pathname).toBe('/bookings/new')
    expect(editTime.getLocation().state).toEqual({
      rescheduleId: 'booking-route',
      serviceId: booking.service.id,
      editTime: true,
      date: '2026-08-05',
    })
  })

  it('передаёт authoritative calendar payload без CRM mutation', async () => {
    const booking = createMasterBooking({
      id: 'booking-calendar',
      date: '2026-08-05',
      time: '11:00',
      clientAddress: 'Москва, Адрес клиента, 1',
      service: createMasterService({ name: 'Консультация', duration: 90 }),
    })
    mocks.getById.mockResolvedValue(booking)
    const view = renderPage('booking-calendar')

    await view.user.click(await screen.findByRole('button', { name: /Добавить в календарь/ }))

    expect(mocks.openAddToCalendar).toHaveBeenCalledWith({
      bookingId: 'booking-calendar',
      title: 'Консультация',
      date: '2026-08-05',
      time: '11:00',
      durationMin: 90,
      location: 'Москва, Адрес клиента, 1',
    })
    expect(mocks.confirmPayment).not.toHaveBeenCalled()
    expect(mocks.cancel).not.toHaveBeenCalled()
  })

  it('передаёт онлайн-ссылку в календарь вместо физического адреса', async () => {
    const link = 'https://meet.example.com/room'
    mocks.getById.mockResolvedValue(createMasterBooking({
      id: 'booking-online-calendar',
      onlineMeetingLink: link,
      clientAddress: null,
    }))
    const view = renderPage('booking-online-calendar')

    await view.user.click(await screen.findByRole('button', { name: /Добавить в календарь/ }))

    expect(mocks.openAddToCalendar).toHaveBeenCalledWith(expect.objectContaining({ location: link }))
  })

  it('для completed записи скрывает mutation actions и блокирует редактирование', async () => {
    mocks.getById.mockResolvedValue(createMasterBooking({
      status: 'COMPLETED',
      paymentStatus: 'PAID',
    }))
    renderPage()

    expect(await screen.findByText('Запись завершена')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Изменить дату' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Изменить время' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Отметить как оплачено/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Отменить/ })).not.toBeInTheDocument()
  })
})
