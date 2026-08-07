import { Route, Routes } from 'react-router-dom'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BOOKING_ID, MASTER_ID, SERVICE_ID } from '@/test/fixtures/auth'
import { createClientBooking } from '@/test/fixtures/bookings'
import { createClientMaster } from '@/test/fixtures/masters'
import { createClientService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'
import { mockDeviceTimezone } from '@/test/time'
import { installWebApp } from '@/test/web-app-fixture'
import type { Booking } from '@client/types'

const api = vi.hoisted(() => ({
  checkAccess: vi.fn(),
  getMaster: vi.fn(),
  create: vi.fn(),
  reschedule: vi.fn(),
  getById: vi.fn(),
  cancel: vi.fn(),
}))

vi.mock('@client/api/masters.api', () => ({
  mastersApi: { checkClientAccess: api.checkAccess, getById: api.getMaster },
}))
vi.mock('@client/api/bookings.api', () => ({
  bookingsApi: {
    create: api.create,
    reschedule: api.reschedule,
    getById: api.getById,
    cancel: api.cancel,
  },
}))
vi.mock('@client/components/AddressSuggestField', () => ({
  default: ({ value, onChange, placeholder }: {
    value: string
    onChange: (value: string) => void
    placeholder: string
  }) => <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />,
}))

import BookingDetailPage from './BookingDetailPage'
import ConfirmPage from './ConfirmPage'
import { useBookingStore } from '../store/booking.store'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

function seedDraft(overrides: Partial<ReturnType<typeof useBookingStore.getState>> = {}) {
  useBookingStore.setState({
    masterId: MASTER_ID,
    masterProfileLink: 'https://max.ru/master',
    rescheduleId: null,
    service: createClientService({ id: SERVICE_ID }),
    categoryName: 'Волосы',
    date: '2030-01-10',
    time: '10:30',
    slots: [],
    remind: false,
    clientAddress: null,
    onlineMeetingLink: null,
    clientApartment: '',
    clientFloor: '',
    clientIntercom: '',
    ...overrides,
  })
}

function renderFlow() {
  return renderAtRoute(
    <Routes>
      <Route path="/" element={<div>Карточка мастера</div>} />
      <Route path="/book/confirm" element={<ConfirmPage />} />
      <Route path="/book/success" element={<BookingDetailPage />} />
      <Route path="/my-bookings" element={<div>Мои записи</div>} />
    </Routes>,
    { route: '/book/confirm' },
  )
}

describe('client standard booking create and reschedule', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.getMaster.mockResolvedValue(createClientMaster({ homeVisit: true }))
    api.cancel.mockResolvedValue(undefined)
    seedDraft()
  })

  it('home-visit create не пишет без адреса, отправляет exact payload один раз и reset делает receipt close', async () => {
    const receipt = createClientBooking({ id: BOOKING_ID, clientAddress: 'Москва, Дом 1' })
    const creation = deferred<Booking>()
    api.create.mockReturnValue(creation.promise)
    api.getById.mockResolvedValue(receipt)
    const view = renderFlow()
    await screen.findByText('Анна Мастерова')
    const submit = screen.getByRole('button', { name: 'Записаться' })

    expect(submit).toBeDisabled()
    expect(api.create).not.toHaveBeenCalled()
    fireEvent.change(screen.getByPlaceholderText('Город, улица, дом...'), {
      target: { value: 'Москва, Дом 1' },
    })
    act(() => useBookingStore.setState({ clientApartment: '15', clientFloor: '7', clientIntercom: '123#' }))
    expect(submit).toBeEnabled()

    await view.user.click(submit)
    expect(api.create).toHaveBeenCalledWith({
      masterId: MASTER_ID,
      serviceId: SERVICE_ID,
      date: '2030-01-10',
      time: '10:30',
      remind: false,
      clientAddress: 'Москва, Дом 1, кв. 15, этаж 7, домофон 123#',
    })
    expect(submit).toBeDisabled()
    await view.user.click(submit)
    expect(api.create).toHaveBeenCalledOnce()

    await act(async () => creation.resolve(receipt))
    await waitFor(() => expect(view.getLocation()).toMatchObject({
      pathname: '/book/success',
      state: { bookingId: BOOKING_ID },
    }))
    expect(useBookingStore.getState().service?.id).toBe(SERVICE_ID)
    await view.user.click(await screen.findByRole('button', { name: 'Закрыть' }))

    expect(view.getLocation().pathname).toBe('/')
    expect(useBookingStore.getState()).toMatchObject({
      masterId: MASTER_ID,
      masterProfileLink: receipt.master.maxProfileLink,
      rescheduleId: null,
      service: null,
      date: '',
      time: '',
      slots: [],
      remind: true,
      clientAddress: null,
      onlineMeetingLink: null,
      clientApartment: '',
      clientFloor: '',
      clientIntercom: '',
    })
  })

  it('фиксирует legacy address bypass пока home-visit master ещё грузится', async () => {
    const masterRequest = deferred<ReturnType<typeof createClientMaster>>()
    const receipt = createClientBooking({ id: BOOKING_ID, clientAddress: null })
    api.getMaster.mockReturnValue(masterRequest.promise)
    api.create.mockResolvedValue(receipt)
    api.getById.mockResolvedValue(receipt)
    const view = renderFlow()
    const submit = screen.getByRole('button', { name: 'Записаться' })

    expect(submit).toBeEnabled()
    await view.user.click(submit)

    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ clientAddress: null }))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/book/success'))
  })

  it('не рендерит confirmation и не пишет без service', async () => {
    seedDraft({ service: null })
    renderFlow()

    await waitFor(() => expect(api.getMaster).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Записаться' })).not.toBeInTheDocument()
    expect(api.create).not.toHaveBeenCalled()
  })

  it('фиксирует legacy submit пустого date/time для non-home draft', async () => {
    mockDeviceTimezone('Europe/Moscow')
    api.getMaster.mockResolvedValue(createClientMaster({ homeVisit: false }))
    const receipt = createClientBooking({ id: BOOKING_ID })
    api.create.mockResolvedValue(receipt)
    api.getById.mockResolvedValue(receipt)
    seedDraft({ date: '', time: '' })
    const view = renderFlow()

    await view.user.click(await screen.findByRole('button', { name: 'Записаться' }))

    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ date: '', time: '' }))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/book/success'))
  })

  it('reschedule отправляет только canonical date/time, блокирует duplicate и очищает draft', async () => {
    const result = createClientBooking({ id: BOOKING_ID, date: '2030-01-11', time: '11:30' })
    const request = deferred<Booking>()
    api.reschedule.mockReturnValue(request.promise)
    seedDraft({
      rescheduleId: BOOKING_ID,
      clientAddress: 'Сохранённый адрес',
      date: '2030-01-11',
      time: '11:30',
    })
    const view = renderFlow()
    const submit = await screen.findByRole('button', { name: 'Перенести' })

    expect(api.reschedule).not.toHaveBeenCalled()
    await view.user.click(submit)
    expect(api.reschedule).toHaveBeenCalledWith(BOOKING_ID, {
      date: '2030-01-11',
      time: '11:30',
    })
    await view.user.click(submit)
    expect(api.reschedule).toHaveBeenCalledOnce()
    expect(api.create).not.toHaveBeenCalled()

    await act(async () => request.resolve(result))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/my-bookings'))
    expect(useBookingStore.getState()).toMatchObject({
      masterId: MASTER_ID,
      rescheduleId: null,
      service: null,
      date: '',
      time: '',
      remind: true,
      clientAddress: null,
      clientApartment: '',
      clientFloor: '',
      clientIntercom: '',
    })
  })

  it('online reschedule не требует физический адрес и сохраняет ссылку записи', async () => {
    const webApp = installWebApp()
    const link = 'https://meet.example.com/room'
    api.reschedule.mockResolvedValue(createClientBooking({ id: BOOKING_ID, onlineMeetingLink: link }))
    seedDraft({
      rescheduleId: BOOKING_ID,
      onlineMeetingLink: link,
      date: '2030-01-11',
      time: '11:30',
    })
    const view = renderFlow()

    await view.user.click(await screen.findByRole('button', { name: 'Открыть ссылку на онлайн-встречу' }))
    expect(webApp.openLink).toHaveBeenCalledWith(link)
    expect(screen.queryByPlaceholderText('Город, улица, дом...')).not.toBeInTheDocument()

    const submit = screen.getByRole('button', { name: 'Перенести' })
    expect(submit).toBeEnabled()
    await view.user.click(submit)

    expect(api.reschedule).toHaveBeenCalledWith(BOOKING_ID, { date: '2030-01-11', time: '11:30' })
    expect(api.create).not.toHaveBeenCalled()
  })

  it('regular blocked race запускает delivery flow и закрывается только после sent', async () => {
    const webApp = installWebApp()
    api.create.mockRejectedValue({
      response: { status: 403, data: { error: 'CLIENT_BLOCKED_BY_MASTER' } },
    })
    api.checkAccess.mockResolvedValue({ access: 'blocked', delivery: 'sent' })
    const view = renderFlow()
    await screen.findByText('Анна Мастерова')
    fireEvent.change(screen.getByPlaceholderText('Город, улица, дом...'), {
      target: { value: 'Москва, Дом 1' },
    })

    await view.user.click(screen.getByRole('button', { name: 'Записаться' }))

    await waitFor(() => expect(webApp.close).toHaveBeenCalledOnce())
    expect(api.checkAccess).toHaveBeenCalledWith(MASTER_ID)
    expect(view.getLocation().pathname).toBe('/book/confirm')
  })

  it('reschedule blocked race подтверждает already_sent перед закрытием', async () => {
    const webApp = installWebApp()
    seedDraft({ rescheduleId: BOOKING_ID, clientAddress: 'Сохранённый адрес' })
    api.reschedule.mockRejectedValue({
      response: { status: 403, data: { error: 'CLIENT_BLOCKED_BY_MASTER' } },
    })
    api.checkAccess.mockResolvedValue({ access: 'blocked', delivery: 'already_sent' })
    const view = renderFlow()

    await view.user.click(await screen.findByRole('button', { name: 'Перенести' }))

    await waitFor(() => expect(webApp.close).toHaveBeenCalledOnce())
    expect(api.checkAccess).toHaveBeenCalledWith(MASTER_ID)
    expect(api.create).not.toHaveBeenCalled()
    expect(view.getLocation().pathname).toBe('/book/confirm')
  })

  it('оставляет форму доступной, если после booking 403 мастер уже разблокировал клиента', async () => {
    const webApp = installWebApp()
    api.create.mockRejectedValue({
      response: { status: 403, data: { error: 'CLIENT_BLOCKED_BY_MASTER' } },
    })
    api.checkAccess.mockResolvedValue({ access: 'allowed' })
    const view = renderFlow()
    await screen.findByText('Анна Мастерова')
    fireEvent.change(screen.getByPlaceholderText('Город, улица, дом...'), {
      target: { value: 'Москва, Дом 1' },
    })

    await view.user.click(screen.getByRole('button', { name: 'Записаться' }))

    await waitFor(() => expect(api.checkAccess).toHaveBeenCalledWith(MASTER_ID))
    expect(webApp.close).not.toHaveBeenCalled()
    expect(view.getLocation().pathname).toBe('/book/confirm')
    expect(screen.getByRole('button', { name: 'Записаться' })).toBeEnabled()
  })
})
