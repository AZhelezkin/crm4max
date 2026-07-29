import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MASTER_ID } from '@/test/fixtures/auth'
import { createClientBooking } from '@/test/fixtures/bookings'
import { createClientMaster } from '@/test/fixtures/masters'
import { renderAtRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getMaster: vi.fn(),
  rememberVisit: vi.fn(),
  listBookings: vi.fn(),
  createReview: vi.fn(),
}))

vi.mock('@/App', () => ({ startParam: '' }))
vi.mock('@client/api/masters.api', () => ({
  mastersApi: { getById: api.getMaster, rememberVisit: api.rememberVisit },
}))
vi.mock('@client/api/bookings.api', () => ({
  bookingsApi: { list: api.listBookings },
}))
vi.mock('@client/api/reviews.api', () => ({
  reviewsApi: { create: api.createReview },
}))

import MasterCardPage from './MasterCardPage'
import { useBookingStore } from '../store/booking.store'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

function seedStore() {
  useBookingStore.setState({
    masterId: MASTER_ID,
    masterProfileLink: null,
    rescheduleId: null,
    service: null,
    categoryName: null,
    date: '',
    time: '',
    slots: [],
    remind: true,
    clientAddress: null,
  })
}

function eligibleBookings() {
  return [
    createClientBooking({
      id: 'review-older',
      status: 'COMPLETED',
      date: '2026-06-01',
      review: null,
    }),
    createClientBooking({
      id: 'review-latest',
      status: 'COMPLETED',
      date: '2026-07-01',
      review: null,
    }),
  ]
}

function mockBookingLists(completed = eligibleBookings()) {
  api.listBookings.mockImplementation(({ status }: { status: string }) =>
    Promise.resolve(status === 'COMPLETED' ? completed : []),
  )
}

describe('MasterCardPage review mutation', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.getMaster.mockResolvedValue(createClientMaster())
    api.rememberVisit.mockResolvedValue(undefined)
    mockBookingLists()
    seedStore()
  })

  it('показывает promo только для последней completed booking без review', async () => {
    renderAtRoute(<MasterCardPage />, { route: '/' })

    expect(await screen.findByText('Оцените услуги мастера')).toBeInTheDocument()
    expect(screen.getByText(/Стрижка, 1 июля/)).toBeInTheDocument()
  })

  it('не предлагает review если completed bookings уже имеют review', async () => {
    mockBookingLists([
      createClientBooking({
        status: 'COMPLETED',
        review: { id: 'existing-review' },
      }),
    ])
    renderAtRoute(<MasterCardPage />, { route: '/' })

    await screen.findByText('Анна Мастерова')
    await waitFor(() => expect(api.listBookings).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Оцените услуги мастера')).not.toBeInTheDocument()
  })

  it('trim-ит text, использует exact booking id и блокирует duplicate review', async () => {
    const request = deferred<{ id: string }>()
    api.createReview.mockReturnValue(request.promise)
    const view = renderAtRoute(<MasterCardPage />, { route: '/' })
    await view.user.click(await screen.findByRole('button', { name: 'Оставить отзыв' }))
    const reviewButtons = screen.getAllByRole('button', { name: 'Оставить отзыв' })
    const submit = reviewButtons[reviewButtons.length - 1]

    expect(submit).toBeDisabled()
    await view.user.click(screen.getByRole('button', { name: 'Оценка 4' }))
    await view.user.type(screen.getByRole('textbox'), '  Отличный результат  ')
    expect(submit).toBeEnabled()
    await view.user.click(submit)

    expect(api.createReview).toHaveBeenCalledWith({
      bookingId: 'review-latest',
      rating: 4,
      text: 'Отличный результат',
    })
    expect(submit).toBeDisabled()
    await view.user.click(submit)
    expect(api.createReview).toHaveBeenCalledOnce()

    await act(async () => request.resolve({ id: 'review-created' }))
    expect(await screen.findByText('Отзыв отправлен')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await waitFor(() => expect(api.getMaster).toHaveBeenCalledTimes(2))
  })

  it('failure не показывает success, сохраняет форму и разрешает retry', async () => {
    api.createReview
      .mockRejectedValueOnce(new Error('review unavailable'))
      .mockResolvedValueOnce({ id: 'review-created' })
    const view = renderAtRoute(<MasterCardPage />, { route: '/' })
    await view.user.click(await screen.findByRole('button', { name: 'Оставить отзыв' }))
    await view.user.click(screen.getByRole('button', { name: 'Оценка 5' }))
    await view.user.type(screen.getByRole('textbox'), 'Повторяемый отзыв')
    let reviewButtons = screen.getAllByRole('button', { name: 'Оставить отзыв' })
    let submit = reviewButtons[reviewButtons.length - 1]

    await view.user.click(submit)

    await waitFor(() => {
      reviewButtons = screen.getAllByRole('button', { name: 'Оставить отзыв' })
      submit = reviewButtons[reviewButtons.length - 1]
      expect(submit).toBeEnabled()
    })
    expect(screen.queryByText('Отзыв отправлен')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('Повторяемый отзыв')

    await view.user.click(submit)
    expect(await screen.findByText('Отзыв отправлен')).toBeInTheDocument()
    expect(api.createReview).toHaveBeenCalledTimes(2)
  })
})
