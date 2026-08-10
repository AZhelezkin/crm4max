import dayjs from 'dayjs'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterBooking } from '@/test/fixtures/bookings'
import { createMasterSchedule } from '@/test/fixtures/schedule'
import { createMasterService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'
import { useBookingsStore } from '@/store/bookings.store'
import { useScheduleStore } from '@/store/schedule.store'

const api = vi.hoisted(() => ({
  listBookings: vi.fn(),
  getSchedule: vi.fn(),
}))

vi.mock('@/api/bookings.api', () => ({ bookingsApi: { list: api.listBookings } }))
vi.mock('@/api/schedule.api', () => ({ scheduleApi: { get: api.getSchedule } }))

import BookingsPage from './BookingsPage'

const TODAY = dayjs().format('YYYY-MM-DD')

function dateInCurrentMonth(predicate: (date: dayjs.Dayjs) => boolean) {
  const start = dayjs().startOf('month')
  for (let offset = 0; offset < start.daysInMonth(); offset += 1) {
    const candidate = start.add(offset, 'day')
    if (predicate(candidate)) return candidate
  }
  throw new Error('No matching date in current month')
}

function calendarDay(date: dayjs.Dayjs) {
  return screen.getByRole('button', { name: String(date.date()) })
}

describe('BookingsPage', () => {
  beforeEach(() => {
    api.listBookings.mockReset()
    api.getSchedule.mockReset()
    sessionStorage.clear()
    useBookingsStore.getState().reset()
    useScheduleStore.getState().reset()
    api.listBookings.mockResolvedValue([])
    api.getSchedule.mockResolvedValue(createMasterSchedule())
  })

  it('фильтрует cancelled и сортирует записи выбранного дня', async () => {
    api.listBookings.mockResolvedValue([
      createMasterBooking({
        id: 'late',
        date: TODAY,
        time: '16:00',
        service: createMasterService({ id: 'late-service', name: 'Поздняя услуга' }),
      }),
      createMasterBooking({
        id: 'cancelled',
        date: TODAY,
        time: '08:00',
        status: 'CANCELLED',
        service: createMasterService({ id: 'cancelled-service', name: 'Отменённая услуга' }),
      }),
      createMasterBooking({
        id: 'early',
        date: TODAY,
        time: '10:00',
        service: createMasterService({ id: 'early-service', name: 'Ранняя услуга' }),
      }),
    ])
    renderAtRoute(<BookingsPage />)

    const early = await screen.findByText('Ранняя услуга')
    const late = screen.getByText('Поздняя услуга')
    expect(early.compareDocumentPosition(late) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText('Отменённая услуга')).not.toBeInTheDocument()
    expect(api.getSchedule).toHaveBeenCalledOnce()
  })

  it('использует schedule для маркировки нерабочих дней', async () => {
    const nonWorking = dateInCurrentMonth((date) => (date.day() || 7) === 7)
    api.getSchedule.mockResolvedValue(createMasterSchedule({ workingDays: [1, 2, 3, 4, 5] }))
    renderAtRoute(<BookingsPage />)
    await waitFor(() => expect(api.getSchedule).toHaveBeenCalledOnce())

    expect(calendarDay(nonWorking)).toHaveStyle({ background: 'var(--color-pattern-element)' })
  })

  it('считает занятость выходного относительно условных восьми часов', async () => {
    const nonWorking = dateInCurrentMonth((date) => (date.day() || 7) === 7)
    api.getSchedule.mockResolvedValue(createMasterSchedule({ workingDays: [1, 2, 3, 4, 5] }))
    api.listBookings.mockResolvedValue([
      createMasterBooking({
        date: nonWorking.format('YYYY-MM-DD'),
        service: createMasterService({ duration: 60 }),
      }),
    ])

    renderAtRoute(<BookingsPage />)

    expect(await screen.findByTestId(`booking-load-${nonWorking.format('YYYY-MM-DD')}`)).toHaveStyle({ width: '13%' })
  })

  it('выбирает дату и передаёт её exact route state в создание записи', async () => {
    const selected = dateInCurrentMonth((date) => date.format('YYYY-MM-DD') !== TODAY)
    const view = renderAtRoute(<BookingsPage />)

    await view.user.click(calendarDay(selected))
    await view.user.click(screen.getByRole('button', { name: 'Создать запись' }))

    expect(view.getLocation().pathname).toBe('/bookings/new')
    expect(view.getLocation().state).toEqual({ date: selected.format('YYYY-MM-DD') })
  })

  it('после выбора даты открывает authoritative booking detail', async () => {
    const selected = dateInCurrentMonth((date) => date.format('YYYY-MM-DD') !== TODAY)
    api.listBookings.mockResolvedValue([
      createMasterBooking({
        id: 'selected-booking',
        date: selected.format('YYYY-MM-DD'),
        service: createMasterService({ name: 'Услуга выбранного дня' }),
      }),
    ])
    const view = renderAtRoute(<BookingsPage />)
    await waitFor(() => expect(api.listBookings).toHaveBeenCalledOnce())

    await view.user.click(calendarDay(selected))
    await view.user.click(await screen.findByText('Услуга выбранного дня'))

    expect(view.getLocation().pathname).toBe('/bookings/selected-booking')
  })

  it('переключает месяц стрелками и через month menu', async () => {
    const view = renderAtRoute(<BookingsPage />)
    const initialMonth = dayjs().startOf('month')

    await view.user.click(screen.getByRole('button', { name: 'Следующий месяц' }))
    expect(screen.getByRole('button', { name: new RegExp(initialMonth.add(1, 'month').format('MMMM'), 'i') })).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: new RegExp(initialMonth.add(1, 'month').format('MMMM'), 'i') }))
    await view.user.click(screen.getByRole('menuitem', { name: 'Январь' }))
    expect(screen.getByRole('button', { name: /январь/i })).toHaveAttribute('aria-expanded', 'false')
  })

  it('показывает empty state для пустого дня', async () => {
    renderAtRoute(<BookingsPage />)

    expect(await screen.findByText('Нет записей на этот день')).toBeInTheDocument()
    expect(api.listBookings).toHaveBeenCalledOnce()
  })

  it('остаётся failure-safe при ошибках bookings и schedule', async () => {
    api.listBookings.mockRejectedValue(new Error('bookings unavailable'))
    api.getSchedule.mockRejectedValue(new Error('schedule unavailable'))
    renderAtRoute(<BookingsPage />)

    expect(await screen.findByText('Нет записей на этот день')).toBeInTheDocument()
    await waitFor(() => {
      expect(api.listBookings).toHaveBeenCalledOnce()
      expect(api.getSchedule).toHaveBeenCalledOnce()
    })
  })
})
