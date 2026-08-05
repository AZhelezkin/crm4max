import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createClientMaster } from '@/test/fixtures/masters'

const MASTER_ID = '10000000-0000-4000-8000-000000000001'
const OTHER_MASTER_ID = '10000000-0000-4000-8000-000000000011'
const BOOKING_ID = '50000000-0000-4000-8000-000000000005'

interface ClientAppSetup {
  startParam?: string
  hash?: string
  query?: string
  storedMasterId?: string
  isLoading?: boolean
}

async function loadClientApp({
  startParam = '',
  hash = '#/',
  query = '',
  storedMasterId = '',
  isLoading = false,
}: ClientAppSetup = {}) {
  vi.resetModules()
  window.history.replaceState(null, '', `/${query}${hash}`)

  const getById = vi.fn().mockResolvedValue(createClientMaster())
  const listBookings = vi.fn().mockResolvedValue([])

  vi.doMock('@/App', () => ({ startParam }))
  vi.doMock('@/components/ScrollToTop', () => ({ default: () => null }))
  vi.doMock('@client/components/MasterCardSkeleton', () => ({
    default: () => <div data-testid="master-card-skeleton">loading master</div>,
  }))
  vi.doMock('@client/components/BottomNav', () => ({ default: () => null }))
  vi.doMock('@client/pages/RecentMastersPage', () => ({
    default: () => <div data-testid="recent-masters">recent</div>,
  }))
  vi.doMock('@client/pages/QRScanPage', () => ({
    default: () => <div data-testid="qr-scan">qr</div>,
  }))
  vi.doMock('@client/pages/ServiceSelectPage', () => ({
    default: () => <div data-testid="service-select">services</div>,
  }))
  vi.doMock('@client/pages/ServiceDetailPage', () => ({
    default: () => <div data-testid="service-detail">service</div>,
  }))
  vi.doMock('@client/pages/CalendarPage', () => ({
    default: () => <div data-testid="calendar">calendar</div>,
  }))
  vi.doMock('@client/pages/PackageBookingPage', () => ({
    default: () => <div data-testid="package">package</div>,
  }))
  vi.doMock('@client/pages/ConfirmPage', () => ({
    default: () => <div data-testid="confirm">confirm</div>,
  }))
  vi.doMock('@client/pages/DepositPage', () => ({
    default: () => <div data-testid="deposit">deposit</div>,
  }))
  vi.doMock('@client/pages/BookingDetailPage', () => ({
    default: () => <div data-testid="booking-detail">booking</div>,
  }))
  vi.doMock('@client/pages/MyBookingsPage', () => ({
    default: () => <div data-testid="my-bookings">bookings</div>,
  }))
  vi.doMock('@client/pages/MessagesPage', () => ({
    default: () => <div data-testid="messages">messages</div>,
  }))
  vi.doMock('@client/api/masters.api', () => ({
    mastersApi: {
      getById,
      getRecentMasters: vi.fn().mockResolvedValue([]),
      getSlots: vi.fn().mockResolvedValue([]),
      getAvailability: vi.fn().mockResolvedValue([]),
    },
  }))
  vi.doMock('@client/api/bookings.api', () => ({
    bookingsApi: {
      list: listBookings,
      create: vi.fn(),
      createPackage: vi.fn(),
      getById: vi.fn(),
      getPackageById: vi.fn(),
      reschedule: vi.fn(),
      cancel: vi.fn(),
      cancelPackage: vi.fn(),
    },
  }))
  vi.doMock('@client/api/reviews.api', () => ({
    reviewsApi: { create: vi.fn() },
  }))

  const { useAuthStore } = await import('@client/store/auth.store')
  useAuthStore.setState({
    token: 'client-test-token',
    clientId: '20000000-0000-4000-8000-000000000002',
    isLoading,
    init: vi.fn().mockResolvedValue(undefined),
  })

  const { useBookingStore } = await import('@client/store/booking.store')
  useBookingStore.setState({ masterId: storedMasterId, masterProfileLink: null })

  const { default: ClientApp } = await import('./ClientApp')
  return { ClientApp, getById }
}

describe.sequential('ClientApp routing', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('показывает список мастеров при пустом запуске', async () => {
    const { ClientApp } = await loadClientApp()

    render(<ClientApp />)

    expect(await screen.findByTestId('recent-masters')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/masters')
  })

  it('показывает QR scanner по явному start_param', async () => {
    const { ClientApp, getById } = await loadClientApp({ startParam: 'qr' })

    render(<ClientApp />)

    expect(await screen.findByTestId('qr-scan')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/qr')

    act(() => {
      window.location.hash = `#/?masterId=${MASTER_ID}`
    })

    await waitFor(() => expect(getById).toHaveBeenCalledWith(MASTER_ID))
  })

  it('использует UUID start_param раньше query и persisted master', async () => {
    const { ClientApp, getById } = await loadClientApp({
      startParam: MASTER_ID,
      query: `?masterId=${OTHER_MASTER_ID}`,
      storedMasterId: OTHER_MASTER_ID,
    })

    render(<ClientApp />)

    await waitFor(() => expect(getById).toHaveBeenCalledWith(MASTER_ID))
  })

  it('использует hash query masterId раньше persisted master', async () => {
    const { ClientApp, getById } = await loadClientApp({
      hash: `#/?masterId=${MASTER_ID}`,
      storedMasterId: OTHER_MASTER_ID,
    })

    render(<ClientApp />)

    await waitFor(() => expect(getById).toHaveBeenCalledWith(MASTER_ID))
  })

  it('пустой запуск показывает список даже при сохранённом мастере', async () => {
    const { ClientApp } = await loadClientApp({ storedMasterId: MASTER_ID })

    render(<ClientApp />)

    expect(await screen.findByTestId('recent-masters')).toBeInTheDocument()
  })

  it('после одноразового booking redirect использует persisted master на root', async () => {
    const { ClientApp, getById } = await loadClientApp({
      startParam: `${MASTER_ID}-${BOOKING_ID}`,
      storedMasterId: OTHER_MASTER_ID,
    })

    render(<ClientApp />)

    expect(await screen.findByTestId('booking-detail')).toBeInTheDocument()
    expect(window.location.hash).toBe(`#/my-bookings/${BOOKING_ID}`)

    act(() => {
      window.location.hash = '#/'
    })

    await waitFor(() => expect(getById).toHaveBeenCalledWith(OTHER_MASTER_ID))
    expect(screen.queryByTestId('booking-detail')).not.toBeInTheDocument()
  })

  it('перенаправляет cmasters только один раз', async () => {
    const { ClientApp } = await loadClientApp({ startParam: 'cmasters' })

    render(<ClientApp />)

    expect(await screen.findByTestId('recent-masters')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/masters')

    act(() => {
      window.location.hash = '#/'
    })

    expect(await screen.findByTestId('qr-scan')).toBeInTheDocument()
    expect(screen.queryByTestId('recent-masters')).not.toBeInTheDocument()
  })

  it('перенаправляет legacy categories route на плоский список услуг', async () => {
    const { ClientApp } = await loadClientApp({ hash: '#/book/categories' })

    render(<ClientApp />)

    expect(await screen.findByTestId('service-select')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/book/services')
  })

  it('перенаправляет неизвестный route на root fallback', async () => {
    const { ClientApp } = await loadClientApp({ hash: '#/unknown' })

    render(<ClientApp />)

    expect(await screen.findByTestId('recent-masters')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/masters')
  })
})

describe.sequential('ClientApp loading presentation', () => {
  it('показывает master skeleton только на root UUID launch', async () => {
    const { ClientApp } = await loadClientApp({ startParam: MASTER_ID, isLoading: true })

    render(<ClientApp />)

    expect(screen.getByTestId('master-card-skeleton')).toBeInTheDocument()
  })

  it('не показывает master skeleton для unrelated deep route', async () => {
    const { ClientApp } = await loadClientApp({
      startParam: MASTER_ID,
      hash: '#/my-bookings',
      isLoading: true,
    })

    const { container } = render(<ClientApp />)

    expect(screen.queryByTestId('master-card-skeleton')).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveStyle({ height: '100dvh' })
  })
})
