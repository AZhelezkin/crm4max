import { Route, Routes } from 'react-router-dom'
import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MASTER_ID } from '@/test/fixtures/auth'
import { createClientMaster } from '@/test/fixtures/masters'
import { renderAtRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getById: vi.fn(),
  rememberVisit: vi.fn(),
  getRecentMasters: vi.fn(),
  listBookings: vi.fn(),
  createReview: vi.fn(),
}))

vi.mock('@/App', () => ({ startParam: '' }))
vi.mock('@client/api/masters.api', () => ({
  mastersApi: {
    getById: api.getById,
    rememberVisit: api.rememberVisit,
    getRecentMasters: api.getRecentMasters,
  },
}))
vi.mock('@client/api/bookings.api', () => ({
  bookingsApi: { list: api.listBookings },
}))
vi.mock('@client/api/reviews.api', () => ({
  reviewsApi: { create: api.createReview },
}))

import MasterCardPage from './MasterCardPage'
import RecentMastersPage from './RecentMastersPage'
import { useBookingStore } from '../store/booking.store'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

function resetBookingStore() {
  useBookingStore.setState({
    masterId: '',
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

describe('client discovery journeys', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.listBookings.mockResolvedValue([])
    api.rememberVisit.mockResolvedValue(undefined)
    api.createReview.mockResolvedValue(undefined)
    resetBookingStore()
  })

  it('RecentMastersPage различает loading и authoritative success', async () => {
    const request = deferred<Array<{ id: string; name: string; photo: null; description: string }>>()
    api.getRecentMasters.mockReturnValue(request.promise)
    const view = renderAtRoute(<RecentMastersPage />, { route: '/recent-masters' })

    expect(screen.queryByText('Анна Мастерова')).not.toBeInTheDocument()
    expect(screen.queryByText(/Пока нет мастеров/)).not.toBeInTheDocument()

    await act(async () => request.resolve([{
      id: MASTER_ID,
      name: 'Анна Мастерова',
      photo: null,
      description: 'Колорист',
    }]))

    await view.user.click(screen.getByRole('button', { name: /Анна Мастерова/ }))
    expect(useBookingStore.getState().masterId).toBe(MASTER_ID)
    expect(view.getLocation().pathname).toBe('/')
  })

  it('RecentMastersPage открывает QR-сканер по кнопке', async () => {
    api.getRecentMasters.mockResolvedValue([])
    const view = renderAtRoute(<RecentMastersPage />, { route: '/masters' })

    await view.user.click(await screen.findByRole('button', { name: 'Сканировать QR-код' }))

    expect(view.getLocation().pathname).toBe('/qr')
  })

  it('RecentMastersPage сводит empty и request failure к одной подсказке', async () => {
    api.getRecentMasters.mockRejectedValue(new Error('recent unavailable'))
    renderAtRoute(<RecentMastersPage />, { route: '/recent-masters' })

    expect(await screen.findByText(/Пока нет мастеров/)).toBeInTheDocument()
  })

  it('MasterCardPage загружает store master и сохраняет profile link', async () => {
    useBookingStore.getState().setMasterId(MASTER_ID)
    const master = createClientMaster({
      name: 'Анна Авторитетная',
      maxProfileLink: 'https://max.ru/authoritative-master',
    })
    api.getById.mockResolvedValue(master)
    renderAtRoute(
      <Routes>
        <Route path="/" element={<MasterCardPage />} />
      </Routes>,
      { route: '/' },
    )

    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
    expect(await screen.findByText('Анна Авторитетная')).toBeInTheDocument()
    expect(screen.getByText('Стрижка')).toBeInTheDocument()
    expect(api.getById).toHaveBeenCalledWith(MASTER_ID)
    expect(api.rememberVisit).toHaveBeenCalledWith(MASTER_ID)
    await waitFor(() => {
      expect(useBookingStore.getState().masterProfileLink).toBe('https://max.ru/authoritative-master')
    })
  })

  it('MasterCardPage сохраняет legacy skeleton при profile load failure', async () => {
    useBookingStore.getState().setMasterId(MASTER_ID)
    api.getById.mockRejectedValue(new Error('profile unavailable'))
    renderAtRoute(<MasterCardPage />, { route: '/' })

    await waitFor(() => expect(api.getById).toHaveBeenCalledWith(MASTER_ID))
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
    expect(screen.queryByText('Анна Мастерова')).not.toBeInTheDocument()
    expect(useBookingStore.getState().masterProfileLink).toBeNull()
  })
})
