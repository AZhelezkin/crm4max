import dayjs from 'dayjs'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterBooking } from '@/test/fixtures/bookings'
import { createSubscriptionState } from '@/test/fixtures/subscriptions'
import { createMasterClient } from '@/test/fixtures/clients'
import { createMasterProfile } from '@/test/fixtures/masters'
import { createMasterService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'
import type { Booking, Client } from '@/types'
import { BookingSeriesGatewayProvider, type BookingSeriesGateway } from '@/features/booking-series/gateway'
import type { BookingSeriesCreateResponse, BookingSeriesPreviewRequest, BookingSeriesPreviewResponse } from '@/features/booking-series/types'

const api = vi.hoisted(() => ({
  listServices: vi.fn(),
  listClients: vi.fn(),
  createClient: vi.fn(),
  listBookings: vi.fn(),
  createBooking: vi.fn(),
  createPackage: vi.fn(),
  reschedule: vi.fn(),
  cancel: vi.fn(),
  getSlots: vi.fn(),
  getEffectiveWindows: vi.fn(),
  getMaster: vi.fn(),
  getSubscription: vi.fn(),
  confirmPayment: vi.fn(),
  openAddToCalendar: vi.fn(),
  scrollPageTop: vi.fn(),
  previewSeries: vi.fn(),
  createSeries: vi.fn(),
  getSeries: vi.fn(),
  previewSeriesChange: vi.fn(),
  updateSeries: vi.fn(),
  cancelSeries: vi.fn(),
}))

vi.mock('@/api/services.api', () => ({ servicesApi: { list: api.listServices } }))
vi.mock('@/api/clients.api', () => ({
  clientsApi: { list: api.listClients, create: api.createClient },
}))
vi.mock('@/api/bookings.api', () => ({
  bookingsApi: {
    list: api.listBookings,
    create: api.createBooking,
    createPackage: api.createPackage,
    reschedule: api.reschedule,
    cancel: api.cancel,
    confirmPayment: api.confirmPayment,
  },
}))
vi.mock('@/api/masters.api', () => ({
  mastersApi: { getSlots: api.getSlots, getMe: api.getMaster },
}))
vi.mock('@/api/schedule.api', () => ({
  scheduleApi: { getEffectiveWindows: api.getEffectiveWindows },
}))
vi.mock('@/api/subscription.api', () => ({
  subscriptionApi: { getMe: api.getSubscription },
}))
vi.mock('@/lib/calendar', () => ({ openAddToCalendar: api.openAddToCalendar }))
vi.mock('@/lib/scroll', () => ({ scrollPageTop: api.scrollPageTop }))
vi.mock('@/components/ServiceEditorPortal', () => ({ default: () => null }))
vi.mock('@/components/AddressPickerPortal', () => ({
  default: ({ open, onClose, onConfirm }: {
    open: boolean
    onClose: () => void
    onConfirm: (address: string, coords: { lat: number; lng: number }, details: { floor: string; apartment: string; intercom: string }) => void
  }) => open ? (
    <button type="button" onClick={() => {
      onConfirm('Москва, Серебряническая набережная, 29', { lat: 55.75, lng: 37.65 }, { floor: '7', apartment: '104', intercom: '123#' })
      onClose()
    }}>
      Выбрать адрес на карте
    </button>
  ) : null,
}))

import { useAuthStore } from '@/store/auth.store'

import CreateBookingPage from './CreateBookingPage'

const regularService = createMasterService({
  id: 'service-regular',
  name: 'Обычная услуга',
  duration: 60,
  price: 250_000,
  sessionsCount: 1,
})
const packageService = createMasterService({
  id: 'service-package',
  name: 'Курс процедур',
  duration: 60,
  price: 200_000,
  sessionsCount: 3,
})
const existingClient = createMasterClient({
  id: 'master-client-existing',
  clientId: 'global-client-existing',
  name: 'Ирина Клиентова',
  phone: '+79990000002',
})

const seriesGateway = {
  preview: api.previewSeries,
  create: api.createSeries,
  get: api.getSeries,
  previewChange: api.previewSeriesChange,
  update: api.updateSeries,
  cancel: api.cancelSeries,
} as unknown as BookingSeriesGateway

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

function setMaster() {
  const profile = createMasterProfile({
    homeVisit: false,
    timezone: 'Europe/Moscow',
    services: [regularService, packageService],
  })
  const master = {
    ...profile,
    schedule: {
      ...profile.schedule!,
      workingDays: [1, 2, 3, 4, 5, 6, 7],
      startTime: '09:00',
      endTime: '12:00',
      breakStart: null,
      breakEnd: null,
    },
  }
  useAuthStore.setState({ token: 'master-token', master, isLoading: false })
  return master
}

function renderPage(state?: Record<string, unknown>, bookingSeriesEnabled = false) {
  const page = bookingSeriesEnabled ? (
    <BookingSeriesGatewayProvider enabled gateway={seriesGateway}>
      <CreateBookingPage />
    </BookingSeriesGatewayProvider>
  ) : <CreateBookingPage />
  return renderAtRoute(page, {
    entries: [{ pathname: '/bookings/new', state }],
  })
}

function formCard(title: string) {
  const heading = screen.getByText(title)
  const card = heading.parentElement?.parentElement
  if (!card) throw new Error(`Form card not found: ${title}`)
  return within(card)
}

async function selectExistingClient(view: ReturnType<typeof renderPage>) {
  await view.user.click(formCard('Клиент').getByRole('button'))
  await view.user.click(await screen.findByRole('button', { name: /Ирина Клиентова/ }))
}

async function selectRegularService(view: ReturnType<typeof renderPage>) {
  await view.user.click(formCard('Услуги').getByRole('button', { name: /Наименование/ }))
  await view.user.click(await screen.findByText('Обычная услуга'))
  await view.user.click(screen.getByRole('button', { name: 'Выбрать' }))
}

async function selectDate(view: ReturnType<typeof renderPage>, selected: dayjs.Dayjs) {
  const monthLabel = screen.getByText(selected.format('MMMM YYYY'))
  const monthSection = monthLabel.parentElement?.parentElement?.parentElement
  if (!monthSection) throw new Error('Month section not found')
  await view.user.click(within(monthSection).getByRole('button', { name: String(selected.date()) }))
}

async function selectRegularDateAndTime(view: ReturnType<typeof renderPage>, selected: dayjs.Dayjs, time = '10:00') {
  await view.user.click(formCard('Дата и время').getByRole('button', { name: /Дата/ }))
  await selectDate(view, selected)
  await view.user.click(formCard('Дата и время').getByRole('button', { name: /Время/ }))
  await selectWheelTime(view, time)
}

async function selectWheelTime(view: ReturnType<typeof renderPage>, time: string, open = false) {
  if (open) await view.user.click(screen.getByRole('button', { name: 'Выбрать время' }))
  const [hour, minute] = time.split(':').map(Number)
  const hours = screen.getByRole('listbox', { name: 'Часы' })
  const minutes = screen.getByRole('listbox', { name: 'Минуты' })
  const firstHour = Number(within(hours).getAllByRole('option')[0].textContent)
  hours.scrollTop = (hour - firstHour) * 30
  minutes.scrollTop = (minute / 15) * 30
  fireEvent.scroll(hours)
  fireEvent.scroll(minutes)
  await view.user.click(screen.getByRole('button', { name: 'Выбрать' }))
}

async function completeRegularDraft(view: ReturnType<typeof renderPage>, selected: dayjs.Dayjs) {
  await selectExistingClient(view)
  await selectRegularService(view)
  await selectRegularDateAndTime(view, selected)
}

async function selectBookingPlace(view: ReturnType<typeof renderPage>, place: 'Принимаю у себя' | 'Выезд' | 'Онлайн') {
  await view.user.click(formCard('Дата и время').getByRole('button', { name: /Где/ }))
  await view.user.click(screen.getByRole('menuitemradio', { name: place }))
}

function bookingResult(date: string, client = existingClient): Booking {
  return createMasterBooking({
    id: 'booking-created',
    date,
    time: '10:00',
    service: regularService,
    client: {
      id: client.clientId ?? client.id,
      name: client.name,
      phone: client.phone,
      photo: client.photo,
    },
  })
}

function nextBookableDate() {
  return dayjs().add(1, 'day').startOf('day')
}

function previewResponse(date: string, time = '10:00', warningsCount = 0): BookingSeriesPreviewResponse {
  return {
    occurrences: [{ date, time, warnings: [] }],
    previewLimit: 12,
    estimatedTotalOccurrences: null,
    materializationOccurrences: 1,
    warningsCount,
  }
}

function createSeriesResponse(date: string): BookingSeriesCreateResponse {
  return {
    series: {
      id: 'series-created',
      status: 'ACTIVE',
      version: 1,
      timezone: 'Europe/Moscow',
      startDate: date,
      endDate: null,
      rule: {
        intervalWeeks: 1,
        slots: [{ dayOfWeek: (dayjs(date).day() || 7) as 1 | 2 | 3 | 4 | 5 | 6 | 7, time: '10:00' }],
      },
    },
    firstBookingId: 'series-booking-first',
    materializedCount: 1,
    warnings: [],
  }
}

async function openSeriesEditor(view: ReturnType<typeof renderPage>) {
  await view.user.click(formCard('Дата и время').getByRole('button', { name: /Повторение/ }))
  await view.user.click(screen.getByRole('menuitem', { name: 'Несколько' }))
  expect(await screen.findByText('Расписание')).toBeInTheDocument()
}

function nextWeekdaySlots(isoWeekday: number, count: number, time: string) {
  const slots: Array<{ date: string; time: string }> = []
  let date = dayjs().add(1, 'day')
  while (slots.length < count) {
    if ((date.day() || 7) === isoWeekday) slots.push({ date: date.format('YYYY-MM-DD'), time })
    date = date.add(1, 'day')
  }
  return slots
}

describe('master CreateBookingPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    Object.values(api).forEach((mock) => mock.mockReset())
    api.listServices.mockResolvedValue([regularService, packageService])
    api.listClients.mockResolvedValue([existingClient])
    api.listBookings.mockResolvedValue([])
    api.createClient.mockResolvedValue(existingClient)
    api.createBooking.mockResolvedValue(bookingResult(nextBookableDate().format('YYYY-MM-DD')))
    api.createPackage.mockResolvedValue({ id: 'package-created' })
    api.reschedule.mockResolvedValue(createMasterBooking())
    api.cancel.mockResolvedValue(undefined)
    api.getSlots.mockResolvedValue(['10:00', '11:00'])
    api.getEffectiveWindows.mockResolvedValue([{ startTime: '09:00', endTime: '12:00' }])
    api.getMaster.mockResolvedValue(createMasterProfile())
    api.previewSeries.mockImplementation(async (request: BookingSeriesPreviewRequest) => previewResponse(request.rule.startDate, request.rule.slots[0]?.time))
    // По умолчанию подписка действует — пейволл не срабатывает.
    api.getSubscription.mockResolvedValue(createSubscriptionState({ status: 'ACTIVE' }))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    setMaster()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('держит кнопку выбора поверх списка услуг с запасом под прокрутку', async () => {
    const view = renderPage()
    await view.user.click(formCard('Услуги').getByRole('button', { name: /Наименование/ }))
    await screen.findByText('Обычная услуга')

    const button = screen.getByRole('button', { name: 'Выбрать' })
    const overlay = button.parentElement?.parentElement
    const page = overlay?.parentElement
    const scrollArea = page?.children[1] as HTMLElement

    expect(page).toHaveStyle({ height: '100dvh', overflow: 'hidden', position: 'relative' })
    expect(overlay).toHaveStyle({ position: 'absolute', bottom: '0px' })
    expect(scrollArea).toHaveStyle({ overflowY: 'auto', paddingBottom: 'calc(132px + env(safe-area-inset-bottom))' })
  })

  it('скрывает прошедшие слоты сегодняшнего дня в часовом поясе мастера', async () => {
    vi.useFakeTimers({ now: new Date('2026-08-04T13:00:30Z'), toFake: ['Date'] })
    const currentMaster = useAuthStore.getState().master!
    useAuthStore.setState({
      master: {
        ...currentMaster,
        timezone: 'Europe/Moscow',
        schedule: { ...currentMaster.schedule!, endTime: '18:00' },
      },
    })
    const view = renderPage()

    await view.user.click(formCard('Дата и время').getByRole('button', { name: /Дата/ }))
    await selectDate(view, dayjs())
    await view.user.click(formCard('Дата и время').getByRole('button', { name: /Время/ }))

    const hours = screen.getByRole('listbox', { name: 'Часы' })
    expect(within(hours).queryByRole('option', { name: '12' })).not.toBeInTheDocument()
    expect(within(hours).getByRole('option', { name: '16' })).toBeInTheDocument()
  })

  it('выбирает время вне графика только после подтверждения', async () => {
    const selectedDate = nextBookableDate()
    const currentMaster = useAuthStore.getState().master!
    useAuthStore.setState({
      master: {
        ...currentMaster,
        schedule: { ...currentMaster.schedule!, workingDays: [] },
      },
    })
    api.getEffectiveWindows.mockResolvedValue([])
    const view = renderPage()

    await view.user.click(formCard('Дата и время').getByRole('button', { name: /Дата/ }))
    await selectDate(view, selectedDate)

    await view.user.click(formCard('Дата и время').getByRole('button', { name: /Время/ }))
    await selectWheelTime(view, '08:00')

    expect(api.getEffectiveWindows).toHaveBeenCalledWith(selectedDate.format('YYYY-MM-DD'))
    expect(screen.getByText('Вне рабочего графика')).toBeInTheDocument()
    expect(screen.getByText(`Записать на ${selectedDate.format('D MMMM')}, 08:00?`)).toBeInTheDocument()
    const dialog = screen.getByText('Вне рабочего графика').parentElement!
    await view.user.click(within(dialog).getByRole('button', { name: 'Записать' }))

    expect(formCard('Дата и время').getByText('08:00')).toBeInTheDocument()
  })

  it('сразу после создания на success-экране есть «Отметить как оплачено»', async () => {
    const selectedDate = nextBookableDate()
    const created = bookingResult(selectedDate.format('YYYY-MM-DD'))
    api.createBooking.mockResolvedValue(created)
    api.confirmPayment.mockResolvedValue({ ...created, paymentStatus: 'PAID' })
    const view = renderPage()

    await completeRegularDraft(view, selectedDate)
    await view.user.click(screen.getByRole('button', { name: 'Записать' }))
    expect(await screen.findByText('Запись создана!')).toBeInTheDocument()

    // Кнопка доступна сразу после создания; тап помечает оплату и убирает кнопку.
    await view.user.click(screen.getByRole('button', { name: 'Отметить как оплачено' }))

    expect(api.confirmPayment).toHaveBeenCalledWith(created.id)
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Отметить как оплачено' })).not.toBeInTheDocument(),
    )
    expect(screen.getByText('ОПЛАЧЕНО')).toBeInTheDocument()
  })

  it('при истёкшем триале подтверждение записи ведёт на экран «Подписка» без create', async () => {
    api.getSubscription.mockResolvedValue(createSubscriptionState({
      status: 'TRIALING',
      trialEndsAt: new Date(Date.now() - 86_400_000).toISOString(),
    }))
    const selectedDate = nextBookableDate()
    const view = renderPage()

    await completeRegularDraft(view, selectedDate)
    await view.user.click(screen.getByRole('button', { name: 'Записать' }))

    expect(api.createBooking).not.toHaveBeenCalled()
    expect(view.getLocation().pathname).toBe('/subscription')
    expect(sessionStorage.getItem('subscription.returnTo')).not.toBeNull()
    expect(sessionStorage.getItem('subscription.bookingDraft')).not.toBeNull()

    view.unmount()
    api.getSubscription.mockResolvedValue(createSubscriptionState({ status: 'ACTIVE' }))
    renderPage({ subscriptionReturn: true })

    expect(await screen.findByText('Ирина Клиентова')).toBeInTheDocument()
    expect(screen.getByText('Обычная услуга')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(sessionStorage.getItem('subscription.bookingDraft')).toBeNull()
  })

  it('проходит все шаги обычной записи, не пишет раньше submit и блокирует duplicate', async () => {
    const selectedDate = nextBookableDate()
    const pending = deferred<Booking>()
    api.createBooking.mockReturnValue(pending.promise)
    const view = renderPage()

    await completeRegularDraft(view, selectedDate)
    expect(api.createBooking).not.toHaveBeenCalled()
    const submit = screen.getByRole('button', { name: 'Записать' })
    expect(submit).toBeEnabled()

    await view.user.click(submit)

    expect(api.createBooking).toHaveBeenCalledWith({
      masterId: useAuthStore.getState().master!.id,
      serviceId: regularService.id,
      date: selectedDate.format('YYYY-MM-DD'),
      time: '10:00',
      masterClientId: existingClient.id,
      remind: true,
      clientAddress: undefined,
      onlineMeetingLink: undefined,
      price: undefined,
      color: '#1F9432',
      services: [{ serviceId: regularService.id, price: undefined }],
      durationMinutes: 60,
      totalPrice: undefined,
      allowOverlap: true,
      allowOutsideSchedule: true,
    })
    expect(screen.getByRole('button', { name: 'Записываем…' })).toBeDisabled()
    await view.user.click(screen.getByRole('button', { name: 'Записываем…' }))
    expect(api.createBooking).toHaveBeenCalledOnce()

    await act(async () => pending.resolve(bookingResult(selectedDate.format('YYYY-MM-DD'))))
    expect(await screen.findByText('Запись создана!')).toBeInTheDocument()
    expect(view.getLocation().pathname).toBe('/bookings/new')
  })

  it('показывает dropdown места и разрешает выбрать выезд независимо от режима профиля', async () => {
    const view = renderPage()

    expect(useAuthStore.getState().master?.homeVisit).toBe(false)
    await view.user.click(formCard('Дата и время').getByRole('button', { name: /Где/ }))

    expect(screen.getByRole('menuitemradio', { name: 'Принимаю у себя' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: 'Выезд' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: 'Онлайн' })).toBeInTheDocument()
    await view.user.click(screen.getByRole('menuitemradio', { name: 'Выезд' }))

    expect(formCard('Дата и время').getByRole('button', { name: /Адрес клиента/ })).toBeInTheDocument()
  })

  it('управляет dropdown места с клавиатуры и возвращает фокус в trigger', async () => {
    const view = renderPage()
    const trigger = formCard('Дата и время').getByRole('button', { name: /Где/ })
    await view.user.click(trigger)

    const masterItem = screen.getByRole('menuitemradio', { name: 'Принимаю у себя' })
    await waitFor(() => expect(masterItem).toHaveFocus())
    await view.user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(formCard('Дата и время').getByRole('button', { name: /Где/ })).toHaveTextContent('Онлайн')
    expect(trigger).toHaveFocus()
  })

  it('для выезда выбирает адрес на карте и сохраняет реквизиты помещения с комментарием', async () => {
    const currentMaster = useAuthStore.getState().master!
    useAuthStore.setState({ master: { ...currentMaster, homeVisit: true } })
    const selectedDate = nextBookableDate()
    const view = renderPage()
    await completeRegularDraft(view, selectedDate)

    await selectBookingPlace(view, 'Выезд')
    await view.user.click(formCard('Дата и время').getByRole('button', { name: /Адрес клиента/ }))
    expect(screen.getByText('Адрес, куда нужно выехать')).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: /Адрес клиента/ }))
    await view.user.click(screen.getByRole('button', { name: 'Выбрать адрес на карте' }))
    await view.user.type(screen.getByRole('textbox', { name: 'Подъезд' }), '2')
    await view.user.type(screen.getByPlaceholderText('Комментарий'), 'Слева от входа')
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    const dateCard = formCard('Дата и время')
    expect(dateCard.getByText('Адрес')).toBeInTheDocument()
    expect(dateCard.queryByText('Адрес клиента')).not.toBeInTheDocument()
    expect(dateCard.getByText('Москва, Серебряническая набережная, 29')).toBeInTheDocument()
    expect(dateCard.getByText(/кв\.\/офис 104/)).toBeInTheDocument()
    expect(dateCard.getByText('Слева от входа')).toBeInTheDocument()
    expect(dateCard.getByText(/подъезд 2, домофон 123#, 7 этаж/)).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Записать' }))

    expect(api.createBooking).toHaveBeenCalledWith(expect.objectContaining({
      clientAddress: 'Москва, Серебряническая набережная, 29\nподъезд 2, этаж 7, кв./офис 104, домофон 123#\nСлева от входа',
      onlineMeetingLink: undefined,
    }))
  })

  it('для онлайн-записи валидирует HTTPS-ссылку и отправляет её без адреса', async () => {
    const selectedDate = nextBookableDate()
    const link = 'https://meet.example.com/room'
    api.createBooking.mockResolvedValue(createMasterBooking({
      ...bookingResult(selectedDate.format('YYYY-MM-DD')),
      onlineMeetingLink: link,
    }))
    const view = renderPage()
    await completeRegularDraft(view, selectedDate)
    await selectBookingPlace(view, 'Онлайн')

    await view.user.click(formCard('Дата и время').getByRole('button', { name: /Ссылка/ }))
    expect(screen.getByText('Ссылка на онлайн-встречу')).toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: 'Ссылка в формате https://' })
    const save = screen.getByRole('button', { name: 'Сохранить' })
    await view.user.type(input, 'http://meet.example.com/room')
    expect(save).toBeDisabled()
    await view.user.clear(input)
    await view.user.type(input, `  ${link}  `)
    expect(save).toBeEnabled()
    await view.user.click(save)

    expect(formCard('Дата и время').getByText(link)).toBeInTheDocument()
    expect(formCard('Дата и время').queryByText('Адрес клиента')).not.toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Записать' }))

    expect(api.createBooking).toHaveBeenCalledWith(expect.objectContaining({
      clientAddress: undefined,
      onlineMeetingLink: link,
    }))
    expect(await screen.findByRole('button', { name: 'Открыть ссылку на онлайн-встречу' })).toHaveTextContent(link)
  })

  it('сохраняет draft и позволяет retry после create failure', async () => {
    const selectedDate = nextBookableDate()
    api.createBooking
      .mockRejectedValueOnce(new Error('create unavailable'))
      .mockResolvedValueOnce(bookingResult(selectedDate.format('YYYY-MM-DD')))
    const view = renderPage()
    await completeRegularDraft(view, selectedDate)

    await view.user.click(screen.getByRole('button', { name: 'Записать' }))

    expect(await screen.findByText('Не удалось создать запись. Попробуйте ещё раз.')).toBeInTheDocument()
    expect(screen.getByText('Обычная услуга')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Записать' })).toBeEnabled()

    await view.user.click(screen.getByRole('button', { name: 'Записать' }))
    expect(await screen.findByText('Запись создана!')).toBeInTheDocument()
    expect(api.createBooking).toHaveBeenCalledTimes(2)
  })

  it('требует explicit confirmation при overlap и только затем пишет', async () => {
    const selectedDate = nextBookableDate()
    api.listBookings.mockResolvedValue([
      createMasterBooking({
        id: 'existing-overlap',
        date: selectedDate.format('YYYY-MM-DD'),
        time: '10:00',
        service: regularService,
      }),
    ])
    const view = renderPage()
    await completeRegularDraft(view, selectedDate)
    await waitFor(() => expect(api.listBookings).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Записать' }))

    expect(screen.getByText('Время занято')).toBeInTheDocument()
    expect(api.createBooking).not.toHaveBeenCalled()
    const dialog = screen.getByText('Время занято').parentElement!
    await view.user.click(within(dialog).getByRole('button', { name: 'Записать' }))

    await waitFor(() => expect(api.createBooking).toHaveBeenCalledOnce())
    expect(api.createBooking.mock.calls[0]?.[0]).toHaveProperty('allowOverlap', true)
  })

  it('создаёт нового клиента отдельно и использует только trusted returned id в final write', async () => {
    const selectedDate = nextBookableDate()
    const trustedClient: Client = createMasterClient({
      id: 'trusted-master-client-id',
      clientId: null,
      name: 'Новый Клиент',
      phone: '+7 (999) 111-22-33',
      isMaxUser: false,
    })
    const clientPending = deferred<Client>()
    api.createClient.mockReturnValue(clientPending.promise)
    api.createBooking.mockResolvedValue(bookingResult(selectedDate.format('YYYY-MM-DD'), trustedClient))
    const view = renderPage({ date: selectedDate.format('YYYY-MM-DD') })
    await view.user.click(formCard('Клиент').getByRole('button'))
    await view.user.click(await screen.findByRole('button', { name: 'Добавить клиента' }))
    const [name, phone] = screen.getAllByRole('textbox')
    await view.user.type(name, '  Новый Клиент  ')
    await view.user.type(phone, '89991112233')

    await view.user.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(api.createClient).toHaveBeenCalledWith({
      name: 'Новый Клиент',
      phone: '+7 (999) 111-22-33',
    })
    expect(api.createBooking).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Добавляем…' })).toBeDisabled()
    await view.user.click(screen.getByRole('button', { name: 'Добавляем…' }))
    expect(api.createClient).toHaveBeenCalledOnce()

    await act(async () => clientPending.resolve(trustedClient))
    expect(await screen.findByText('Новый Клиент')).toBeInTheDocument()
    expect(api.createBooking).not.toHaveBeenCalled()

    await selectRegularService(view)
    await view.user.click(formCard('Дата и время').getByRole('button', { name: /Время/ }))
    await selectWheelTime(view, '10:00')
    await view.user.click(screen.getByRole('button', { name: 'Записать' }))

    await waitFor(() => expect(api.createBooking).toHaveBeenCalledOnce())
    expect(api.createBooking.mock.calls[0]?.[0]).toMatchObject({
      masterClientId: 'trusted-master-client-id',
      date: selectedDate.format('YYYY-MM-DD'),
      serviceId: regularService.id,
    })
  })

  it('не коммитит режим серии при возврате из первого редактора', async () => {
    const selectedDate = nextBookableDate()
    const view = renderPage(undefined, true)
    await completeRegularDraft(view, selectedDate)

    await openSeriesEditor(view)
    await view.user.click(screen.getByRole('button', { name: 'Назад' }))

    expect(formCard('Дата и время').getByRole('button', { name: /Повторение.*Разовая/ })).toBeInTheDocument()
    expect(api.previewSeries).toHaveBeenCalledOnce()
    expect(api.createSeries).not.toHaveBeenCalled()
  })

  it('сохраняет настройку серии до выбора клиента и услуги без server preview', async () => {
    const view = renderPage(undefined, true)

    await openSeriesEditor(view)
    await view.user.click(screen.getByRole('button', { name: /Выбрать время/ }))
    await view.user.click(screen.getByRole('button', { name: 'Выбрать' }))
    await view.user.click(screen.getByRole('button', { name: 'Продолжить' }))

    expect(formCard('Дата и время').getByRole('button', { name: /Повторение.*Несколько/ })).toBeInTheDocument()
    expect(screen.queryByText('Сначала выберите клиента и услуги и проверьте данные записи.')).not.toBeInTheDocument()
    expect(api.previewSeries).not.toHaveBeenCalled()
  })

  it('показывает повторение перед временем в карточке даты', () => {
    renderPage(undefined, true)
    const card = formCard('Дата и время')
    const repetition = card.getByRole('button', { name: /Повторение/ })
    const time = card.getByRole('button', { name: /Время/ })

    expect(repetition.compareDocumentPosition(time) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('не открывает редактор серии для онлайн-записи', async () => {
    const selectedDate = nextBookableDate()
    const view = renderPage(undefined, true)
    await completeRegularDraft(view, selectedDate)
    await selectBookingPlace(view, 'Онлайн')

    await view.user.click(formCard('Дата и время').getByRole('button', { name: /Повторение/ }))
    await view.user.click(screen.getByRole('menuitem', { name: 'Несколько' }))

    expect(await screen.findByText(/Онлайн-запись пока недоступна для серии/)).toBeInTheDocument()
    expect(screen.queryByText('Расписание')).not.toBeInTheDocument()
    expect(formCard('Дата и время').getByRole('button', { name: /Где/ })).toHaveTextContent('Онлайн')
    expect(api.previewSeries).not.toHaveBeenCalled()
  })

  it('не переключает настроенную серию в онлайн-формат', async () => {
    const selectedDate = nextBookableDate()
    api.previewSeries.mockResolvedValue(previewResponse(selectedDate.format('YYYY-MM-DD')))
    const view = renderPage(undefined, true)
    await completeRegularDraft(view, selectedDate)
    await openSeriesEditor(view)
    await view.user.click(screen.getByRole('button', { name: 'Продолжить' }))

    await selectBookingPlace(view, 'Онлайн')

    expect(await screen.findByText(/Онлайн-запись пока недоступна для серии/)).toBeInTheDocument()
    expect(formCard('Дата и время').getByRole('button', { name: /Где/ })).toHaveTextContent('Принимаю у себя')
    expect(formCard('Дата и время').queryByRole('button', { name: /Ссылка/ })).not.toBeInTheDocument()
  })

  it('создаёт серию только после authoritative preview с точным Max client identity', async () => {
    const selectedDate = nextBookableDate()
    const date = selectedDate.format('YYYY-MM-DD')
    api.previewSeries.mockResolvedValue(previewResponse(date))
    api.createSeries.mockResolvedValue(createSeriesResponse(date))
    const view = renderPage(undefined, true)
    await completeRegularDraft(view, selectedDate)
    await openSeriesEditor(view)

    await waitFor(() => expect(api.previewSeries).toHaveBeenCalledOnce())
    expect(api.previewSeries).toHaveBeenCalledWith({
      masterId: useAuthStore.getState().master!.id,
      template: {
        clientId: existingClient.clientId,
        masterClientId: null,
        services: [{ serviceId: regularService.id, price: null }],
        totalPrice: null,
        durationMinutes: 60,
        clientAddress: null,
        notes: null,
        remind: true,
        color: '#1F9432',
      },
      rule: {
        startDate: date,
        endDate: null,
        intervalWeeks: 1,
        timezone: 'Europe/Moscow',
        slots: [{ dayOfWeek: (selectedDate.day() || 7), time: '10:00' }],
      },
    })
    expect(api.createSeries).not.toHaveBeenCalled()
    await view.user.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect(formCard('Дата и время').getByRole('button', { name: /Повторение.*Несколько/ })).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Записать' }))

    await waitFor(() => expect(api.createSeries).toHaveBeenCalledOnce())
    expect(api.createSeries.mock.calls[0]?.[0]).toEqual({
      ...api.previewSeries.mock.calls[0]?.[0],
      allowConflicts: false,
    })
    expect(api.createSeries.mock.calls[0]?.[1]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(api.createBooking).not.toHaveBeenCalled()
    expect(await screen.findByText('Серия создана!')).toBeInTheDocument()
  })

  it('инвалидирует preview после изменения шаблона и требует повторную проверку', async () => {
    const selectedDate = nextBookableDate()
    const date = selectedDate.format('YYYY-MM-DD')
    api.previewSeries.mockResolvedValue(previewResponse(date))
    const view = renderPage(undefined, true)
    await completeRegularDraft(view, selectedDate)
    await openSeriesEditor(view)
    await waitFor(() => expect(api.previewSeries).toHaveBeenCalledOnce())
    await view.user.click(screen.getByRole('button', { name: 'Продолжить' }))

    await view.user.click(formCard('Дата и время').getByRole('button', { name: /Напоминание клиенту/ }))

    expect(screen.queryByText('Проверьте расписание снова')).not.toBeInTheDocument()
    await waitFor(() => expect(api.previewSeries).toHaveBeenCalledTimes(2))
    expect(api.previewSeries.mock.calls[1]?.[0]).toMatchObject({ template: { remind: false } })
    expect(screen.getByRole('button', { name: 'Записать' })).toBeEnabled()
  })

  it('отклоняет incomplete package и сохраняет ordered slots для retry', async () => {
    const view = renderPage({ client: existingClient })
    await view.user.click(formCard('Услуги').getByRole('button', { name: /Наименование/ }))
    await view.user.click(await screen.findByText('Курс процедур'))
    expect(screen.getByRole('button', { name: /Записать/ })).toBeDisabled()
    expect(api.createPackage).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'По неделям' }))
    await view.user.click(screen.getByRole('button', { name: 'Пн' }))
    await view.user.click(await screen.findByRole('button', { name: '11:00' }))
    const expectedSlots = nextWeekdaySlots(1, 3, '11:00')
    api.createPackage.mockRejectedValueOnce(new Error('package unavailable')).mockResolvedValueOnce({ id: 'package-created' })

    await view.user.click(screen.getByRole('button', { name: /Записать/ }))

    expect(await screen.findByText('Не удалось создать запись. Попробуйте ещё раз.')).toBeInTheDocument()
    expect(api.createPackage).toHaveBeenCalledWith({
      masterId: useAuthStore.getState().master!.id,
      serviceId: packageService.id,
      slots: expectedSlots,
      masterClientId: existingClient.id,
      remind: true,
      clientAddress: undefined,
      onlineMeetingLink: undefined,
      allowOutsideSchedule: true,
    })
    expect(screen.getByRole('button', { name: /Записать/ })).toBeEnabled()

    await view.user.click(screen.getByRole('button', { name: /Записать/ }))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/bookings'))
    expect(api.createPackage).toHaveBeenCalledTimes(2)
    expect(api.createBooking).not.toHaveBeenCalled()
  })

  it('применяет одну онлайн-ссылку ко всем сеансам package', async () => {
    const link = 'https://meet.example.com/course'
    const view = renderPage({ client: existingClient })
    await view.user.click(formCard('Услуги').getByRole('button', { name: /Наименование/ }))
    await view.user.click(await screen.findByText('Курс процедур'))

    await view.user.click(screen.getByRole('button', { name: /Где/ }))
    await view.user.click(screen.getByRole('menuitemradio', { name: 'Онлайн' }))
    expect(screen.getByRole('button', { name: /Записать/ })).toBeDisabled()

    await view.user.click(screen.getByRole('button', { name: /Ссылка/ }))
    await view.user.type(screen.getByRole('textbox', { name: 'Ссылка в формате https://' }), link)
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await view.user.click(screen.getByRole('button', { name: 'По неделям' }))
    await view.user.click(screen.getByRole('button', { name: 'Пн' }))
    await view.user.click(await screen.findByRole('button', { name: '11:00' }))
    const expectedSlots = nextWeekdaySlots(1, 3, '11:00')
    await view.user.click(screen.getByRole('button', { name: /Записать/ }))

    expect(api.createPackage).toHaveBeenCalledWith({
      masterId: useAuthStore.getState().master!.id,
      serviceId: packageService.id,
      slots: expectedSlots,
      masterClientId: existingClient.id,
      remind: true,
      clientAddress: undefined,
      onlineMeetingLink: link,
      allowOutsideSchedule: true,
    })
  })

  it('bootstrap reschedule не создаёт booking и пишет только после confirmation', async () => {
    const selectedDate = nextBookableDate()
    const view = renderPage({ rescheduleId: 'booking-reschedule', serviceId: regularService.id })
    expect(await screen.findByText('Новая дата')).toBeInTheDocument()

    await selectDate(view, selectedDate)
    await selectWheelTime(view, '10:00', true)

    expect(screen.getByText('Перенести запись')).toBeInTheDocument()
    expect(api.reschedule).not.toHaveBeenCalled()
    expect(api.createBooking).not.toHaveBeenCalled()
    const dialog = screen.getByText('Перенести запись').parentElement!
    await view.user.click(within(dialog).getByRole('button', { name: 'Перенести' }))

    await waitFor(() => expect(api.reschedule).toHaveBeenCalledWith('booking-reschedule', {
      date: selectedDate.format('YYYY-MM-DD'),
      time: '10:00',
      allowOverlap: true,
      allowOutsideSchedule: true,
    }))
    expect(api.createBooking).not.toHaveBeenCalled()
    await waitFor(() => expect(view.getLocation().pathname).toBe('/bookings'))
  })

  it('bootstrap edit-time сохраняет дату и legacy navigates даже после reschedule failure', async () => {
    const selectedDate = nextBookableDate().format('YYYY-MM-DD')
    api.reschedule.mockRejectedValue(new Error('reschedule unavailable'))
    const view = renderPage({
      rescheduleId: 'booking-edit-time',
      serviceId: regularService.id,
      editTime: true,
      date: selectedDate,
    })
    expect(await screen.findByText('Выберите время')).toBeInTheDocument()

    await selectWheelTime(view, '11:00', true)
    const dialog = screen.getByText('Перенести запись').parentElement!
    await view.user.click(within(dialog).getByRole('button', { name: 'Перенести' }))

    await waitFor(() => expect(api.reschedule).toHaveBeenCalledWith('booking-edit-time', {
      date: selectedDate,
      time: '11:00',
      allowOverlap: true,
      allowOutsideSchedule: true,
    }))
    expect(api.createBooking).not.toHaveBeenCalled()
    await waitFor(() => expect(view.getLocation().pathname).toBe('/bookings'))
  })

  it('cancel-created ждёт confirmation, использует receipt id и завершает route', async () => {
    const selectedDate = nextBookableDate()
    const created = bookingResult(selectedDate.format('YYYY-MM-DD'))
    api.createBooking.mockResolvedValue(created)
    const view = renderPage()
    await completeRegularDraft(view, selectedDate)
    await view.user.click(screen.getByRole('button', { name: 'Записать' }))
    expect(await screen.findByText('Запись создана!')).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Действия' }))
    await view.user.click(screen.getByRole('menuitem', { name: 'Отменить' }))
    expect(api.cancel).not.toHaveBeenCalled()
    await view.user.click(screen.getByRole('button', { name: 'Отменить запись' }))

    await waitFor(() => expect(api.cancel).toHaveBeenCalledWith('booking-created'))
    expect(api.cancel).toHaveBeenCalledOnce()
    await waitFor(() => expect(view.getLocation().pathname).toBe('/bookings'))
  })

  it('фиксирует legacy route completion после cancel-created failure без ложного второго call', async () => {
    const selectedDate = nextBookableDate()
    api.createBooking.mockResolvedValue(bookingResult(selectedDate.format('YYYY-MM-DD')))
    api.cancel.mockRejectedValue(new Error('cancel unavailable'))
    const view = renderPage()
    await completeRegularDraft(view, selectedDate)
    await view.user.click(screen.getByRole('button', { name: 'Записать' }))
    await screen.findByText('Запись создана!')

    await view.user.click(screen.getByRole('button', { name: 'Действия' }))
    await view.user.click(screen.getByRole('menuitem', { name: 'Отменить' }))
    await view.user.click(screen.getByRole('button', { name: 'Отменить запись' }))

    await waitFor(() => expect(api.cancel).toHaveBeenCalledWith('booking-created'))
    expect(api.cancel).toHaveBeenCalledOnce()
    await waitFor(() => expect(view.getLocation().pathname).toBe('/bookings'))
  })
})
