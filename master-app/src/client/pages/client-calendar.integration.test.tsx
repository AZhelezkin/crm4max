import dayjs from 'dayjs'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MASTER_ID, SERVICE_ID } from '@/test/fixtures/auth'
import { createClientMaster } from '@/test/fixtures/masters'
import { createClientService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getById: vi.fn(),
  getAvailability: vi.fn(),
  getSlots: vi.fn(),
}))

vi.mock('@client/api/masters.api', () => ({
  mastersApi: {
    getById: api.getById,
    getAvailability: api.getAvailability,
    getSlots: api.getSlots,
  },
}))

import CalendarPage from './CalendarPage'
import { useBookingStore } from '../store/booking.store'

function resetBookingStore() {
  useBookingStore.setState({
    masterId: MASTER_ID,
    masterProfileLink: null,
    rescheduleId: null,
    service: createClientService({ id: SERVICE_ID }),
    categoryName: null,
    date: '',
    time: '',
    slots: [],
    remind: true,
    clientAddress: null,
  })
}

function availableDayButton(date: dayjs.Dayjs) {
  return screen
    .getAllByRole('button', { name: String(date.date()) })
    .find((button) => !button.hasAttribute('disabled'))
}

describe('client CalendarPage', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.getById.mockResolvedValue(createClientMaster())
    resetBookingStore()
  })

  it('загружает availability/slots и сохраняет master-local slot при client-visible time', async () => {
    const target = dayjs().startOf('day').add(1, 'day')
    const availability = { [target.format('YYYY-MM-DD')]: true }
    const request = new Promise<Record<string, boolean>>((resolve) => {
      setTimeout(() => resolve(availability), 0)
    })
    api.getAvailability.mockReturnValue(request)
    api.getSlots.mockResolvedValue([{
      time: '12:30',
      masterDate: '2030-01-10',
      masterTime: '10:30',
    }])
    const view = renderAtRoute(<CalendarPage />, { route: '/book/calendar' })

    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
    await waitFor(() => expect(api.getAvailability).toHaveBeenCalled())
    expect(api.getAvailability).toHaveBeenCalledWith(
      MASTER_ID,
      dayjs().format('YYYY-MM-DD'),
      dayjs().startOf('month').add(2, 'month').endOf('month').format('YYYY-MM-DD'),
      SERVICE_ID,
    )
    const dayButton = await waitFor(() => {
      const button = availableDayButton(target)
      expect(button).toBeDefined()
      return button!
    })
    await view.user.click(dayButton)

    expect(api.getSlots).toHaveBeenCalledWith(MASTER_ID, target.format('YYYY-MM-DD'), SERVICE_ID)
    await view.user.click(await screen.findByRole('button', { name: 'Выбрать время' }))
    await view.user.click(screen.getByRole('button', { name: 'Выбрать' }))

    expect(useBookingStore.getState()).toMatchObject({
      date: '2030-01-10',
      time: '10:30',
    })
    expect(view.getLocation().pathname).toBe('/book/confirm')
  })

  it('показывает empty slots после slots request failure и разрешает вернуться к date', async () => {
    const target = dayjs().startOf('day').add(2, 'day')
    api.getAvailability.mockResolvedValue({ [target.format('YYYY-MM-DD')]: true })
    api.getSlots.mockRejectedValue(new Error('slots unavailable'))
    const view = renderAtRoute(<CalendarPage />, { route: '/book/calendar' })
    const dayButton = await waitFor(() => {
      const button = availableDayButton(target)
      expect(button).toBeDefined()
      return button!
    })

    await view.user.click(dayButton)
    expect(await screen.findByText('Нет свободных слотов')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Назад' }))
    expect(screen.getByText('Выберите дату')).toBeInTheDocument()
  })

  it('открывает список времени сразу для выбранной даты', async () => {
    useBookingStore.setState({ date: '2030-01-10', time: '10:30' })
    api.getAvailability.mockResolvedValue({})
    api.getSlots.mockResolvedValue([{ time: '12:30', masterDate: '2030-01-10', masterTime: '10:30' }])

    renderAtRoute(<CalendarPage />, {
      entries: [{ pathname: '/book/calendar', state: { step: 'time' } }],
    })

    expect(screen.getByText('Выберите время')).toBeInTheDocument()
    await waitFor(() => expect(api.getSlots).toHaveBeenCalledWith(MASTER_ID, '2030-01-10', SERVICE_ID))
    expect(await screen.findByRole('button', { name: 'Выбрать время' })).toBeInTheDocument()
  })

  it('package session скрывает занятый slot и пишет canonical slot по индексу', async () => {
    const target = dayjs().startOf('day').add(3, 'day')
    useBookingStore.setState({
      service: createClientService({ id: SERVICE_ID, sessionsCount: 2 }),
      slots: [{ date: '2030-01-10', time: '10:30' }],
    })
    api.getAvailability.mockResolvedValue({ [target.format('YYYY-MM-DD')]: true })
    api.getSlots.mockResolvedValue([
      { time: '12:30', masterDate: '2030-01-10', masterTime: '10:30' },
      { time: '13:30', masterDate: '2030-01-10', masterTime: '11:30' },
    ])
    const view = renderAtRoute(<CalendarPage />, {
      entries: [
        '/book/package',
        { pathname: '/book/calendar', state: { sessionIndex: 1 } },
      ],
    })
    const dayButton = await waitFor(() => {
      const button = availableDayButton(target)
      expect(button).toBeDefined()
      return button!
    })

    await view.user.click(dayButton)
    expect(await screen.findByText('Приём 2 из 2')).toBeInTheDocument()
    await waitFor(() => expect(api.getSlots).toHaveBeenCalled())
    await view.user.click(await screen.findByRole('button', { name: 'Выбрать время' }))
    expect(screen.getByRole('button', { name: 'Выбрать' })).toBeEnabled()
    await view.user.click(screen.getByRole('button', { name: 'Выбрать' }))

    expect(useBookingStore.getState().slots).toEqual([
      { date: '2030-01-10', time: '10:30' },
      { date: '2030-01-10', time: '11:30' },
    ])
    expect(view.getLocation().pathname).toBe('/book/package')
  })
})
