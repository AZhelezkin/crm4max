import { Route, Routes } from 'react-router-dom'
import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MASTER_ID } from '@/test/fixtures/auth'
import { createClientMaster } from '@/test/fixtures/masters'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'

const api = vi.hoisted(() => ({
  checkAccess: vi.fn(),
  getById: vi.fn(),
  rememberVisit: vi.fn(),
  getRecentMasters: vi.fn(),
  listBookings: vi.fn(),
  createReview: vi.fn(),
}))

vi.mock('@/App', () => ({ startParam: '' }))
vi.mock('@client/api/masters.api', () => ({
  mastersApi: {
    checkClientAccess: api.checkAccess,
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
    api.checkAccess.mockResolvedValue({ access: 'allowed' })
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
    expect(api.checkAccess).toHaveBeenCalledWith(MASTER_ID)
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

  it('не загружает профиль из списка до authoritative allowed access', async () => {
    const access = deferred<{ access: 'allowed' }>()
    const master = createClientMaster({ name: 'Мастер после gate' })
    api.getRecentMasters.mockResolvedValue([{
      id: MASTER_ID,
      name: 'Мастер из списка',
      photo: null,
      description: 'Колорист',
    }])
    api.checkAccess.mockReturnValue(access.promise)
    api.getById.mockResolvedValue(master)
    const view = renderAtRoute(
      <Routes>
        <Route path="/masters" element={<RecentMastersPage />} />
        <Route path="/" element={<MasterCardPage />} />
      </Routes>,
      { route: '/masters' },
    )

    await view.user.click(await screen.findByRole('button', { name: /Мастер из списка/ }))
    await waitFor(() => expect(api.checkAccess).toHaveBeenCalledWith(MASTER_ID))
    expect(api.getById).not.toHaveBeenCalled()
    expect(screen.queryByText('Мастер после gate')).not.toBeInTheDocument()

    await act(async () => access.resolve({ access: 'allowed' }))
    expect(await screen.findByText('Мастер после gate')).toBeInTheDocument()
  })

  it.each(['sent', 'already_sent'] as const)('blocked delivery=%s закрывает miniapp без загрузки профиля', async (delivery) => {
    const webApp = installWebApp()
    useBookingStore.getState().setMasterId(MASTER_ID)
    api.checkAccess.mockResolvedValue({ access: 'blocked', delivery })
    api.getById.mockResolvedValue(createClientMaster({ name: 'Скрытый мастер' }))

    renderAtRoute(<MasterCardPage />, { route: '/' })

    await waitFor(() => expect(webApp.close).toHaveBeenCalledOnce())
    expect(api.getById).not.toHaveBeenCalled()
    expect(screen.queryByText('Скрытый мастер')).not.toBeInTheDocument()
    expect(screen.getByText('Профиль недоступен')).toBeInTheDocument()
  })

  it('не закрывает miniapp по stale blocked response после unmount', async () => {
    const webApp = installWebApp()
    const access = deferred<{ access: 'blocked'; delivery: 'sent' }>()
    useBookingStore.getState().setMasterId(MASTER_ID)
    api.checkAccess.mockReturnValue(access.promise)
    const view = renderAtRoute(<MasterCardPage />, { route: '/' })
    await waitFor(() => expect(api.checkAccess).toHaveBeenCalledWith(MASTER_ID))

    view.unmount()
    await act(async () => access.resolve({ access: 'blocked', delivery: 'sent' }))

    expect(webApp.close).not.toHaveBeenCalled()
    expect(api.getById).not.toHaveBeenCalled()
  })

  it('delivery failure оставляет neutral retry и не раскрывает профиль', async () => {
    const webApp = installWebApp()
    useBookingStore.getState().setMasterId(MASTER_ID)
    api.checkAccess
      .mockRejectedValueOnce({ response: { status: 503, data: { error: 'CLIENT_BLOCKED_NOTICE_DELIVERY_FAILED' } } })
      .mockResolvedValueOnce({ access: 'allowed' })
    api.getById.mockResolvedValue(createClientMaster({ name: 'Мастер после повтора' }))
    const view = renderAtRoute(<MasterCardPage />, { route: '/' })

    const retry = await screen.findByRole('button', { name: 'Повторить' })
    expect(webApp.close).not.toHaveBeenCalled()
    expect(api.getById).not.toHaveBeenCalled()
    expect(screen.queryByText('Мастер после повтора')).not.toBeInTheDocument()

    await view.user.click(retry)

    expect(await screen.findByText('Мастер после повтора')).toBeInTheDocument()
    expect(api.checkAccess).toHaveBeenCalledTimes(2)
    expect(webApp.close).not.toHaveBeenCalled()
  })
})
