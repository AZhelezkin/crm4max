import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterProfile } from '@/test/fixtures/masters'
import { server } from '@/test/msw/server'
import { installWebApp, removeWebApp } from '@/test/web-app-fixture'

const MASTER_ID = '10000000-0000-4000-8000-000000000001'
const BOOKING_ID = '50000000-0000-4000-8000-000000000005'

interface AppSetup {
  webAppStart?: string
  initData?: string
  search?: string
  hash?: string
}

async function loadApp({ webAppStart, initData, search = '', hash = '#/' }: AppSetup = {}) {
  vi.resetModules()
  window.history.replaceState(null, '', `/${search}${hash}`)

  if (webAppStart !== undefined || initData !== undefined) {
    installWebApp({
      initData: initData ?? 'signed-max-init-data',
      initDataUnsafe: webAppStart === undefined ? {} : { start_param: webAppStart },
    })
  } else {
    removeWebApp()
  }

  vi.doMock('@client/ClientApp', () => ({
    default: () => <div data-testid="client-app">client</div>,
  }))
  vi.doMock('@/components/ScrollToTop', () => ({
    default: () => null,
  }))
  vi.doMock('@/pages/HomePage', () => ({
    default: () => <div data-testid="master-home">master</div>,
  }))
  vi.doMock('@/pages/BookingDetailPage', () => ({
    default: () => <div data-testid="master-booking">booking</div>,
  }))
  vi.doMock('@/pages/SubscriptionPlanPage', () => ({
    default: () => <div data-testid="subscription-plan">subscription</div>,
  }))
  vi.doMock('@/pages/MapTestPage', () => ({
    default: () => <div data-testid="map-test">map</div>,
  }))
  vi.doMock('@/standalone-pages/handoff/destination-selector/DestinationSelectorPage', () => ({
    default: ({ token }: { token: string }) => <div data-testid="destination-selector">{token}</div>,
  }))
  vi.doMock('@/api/subscription.api', () => ({
    subscriptionApi: {
      getMe: vi.fn().mockResolvedValue(null),
    },
  }))

  const { useAuthStore } = await import('@/store/auth.store')
  useAuthStore.setState({
    token: 'master-test-token',
    master: createMasterProfile(),
    isLoading: false,
    init: vi.fn().mockResolvedValue(undefined),
  })

  return import('./App')
}

describe.sequential('App launch routing', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it.each([
    ['mmode', 'master-home'],
    [MASTER_ID, 'client-app'],
    ['cmasters', 'client-app'],
    [`${MASTER_ID}-${BOOKING_ID}`, 'client-app'],
  ])('маршрутизирует start_param %s', async (startParam, expectedScreen) => {
    const { default: App } = await loadApp({ webAppStart: startParam })

    render(<App />)

    expect(await screen.findByTestId(expectedScreen)).toBeInTheDocument()
  })

  it('маршрутизирует master booking deep link и возвращает booking id', async () => {
    const { default: App, getMasterBookingDeepLinkId } = await loadApp({
      webAppStart: `m-${MASTER_ID}-${BOOKING_ID}`,
    })

    render(<App />)

    expect(getMasterBookingDeepLinkId()).toBe(BOOKING_ID)
    expect(await screen.findByTestId('master-booking')).toBeInTheDocument()
    expect(window.location.hash).toBe(`#/bookings/${BOOKING_ID}`)
  })

  it('открывает подписку мастера по start_param msubscription', async () => {
    const { default: App } = await loadApp({ webAppStart: 'msubscription', hash: '#/other' })

    render(<StrictMode><App /></StrictMode>)

    expect(await screen.findByTestId('subscription-plan')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/subscription')
  })

  it('предпочитает MAX start_param browser query', async () => {
    const { default: App, startParam } = await loadApp({
      webAppStart: 'mmode',
      search: `?startapp=${MASTER_ID}`,
    })

    render(<App />)

    expect(startParam).toBe('mmode')
    expect(await screen.findByTestId('master-home')).toBeInTheDocument()
  })

  it.each([
    [`?startapp=${MASTER_ID}`, MASTER_ID],
    [`?masterId=${MASTER_ID}`, MASTER_ID],
  ])('использует browser fallback %s', async (search, expectedStartParam) => {
    const { default: App, startParam } = await loadApp({ search })

    render(<App />)

    expect(startParam).toBe(expectedStartParam)
    expect(await screen.findByTestId('client-app')).toBeInTheDocument()
  })

  it('предпочитает startapp legacy masterId query', async () => {
    const { startParam } = await loadApp({
      search: `?startapp=mmode&masterId=${MASTER_ID}`,
    })

    expect(startParam).toBe('mmode')
  })

  it('не извлекает authority из malformed composite parameter', async () => {
    const { default: App, getMasterBookingDeepLinkId } = await loadApp({
      webAppStart: `m-${MASTER_ID}-not-a-booking`,
      initData: '',
    })

    render(<App />)

    expect(getMasterBookingDeepLinkId()).toBeNull()
    expect(await screen.findByTestId('client-app')).toBeInTheDocument()
  })

  it('открывает destination selector до обычного shell', async () => {
    const { default: App } = await loadApp({
      webAppStart: 'm-dest-token-123',
      initData: '',
    })

    render(<App />)

    expect(screen.getByTestId('destination-selector')).toHaveTextContent('token-123')
    expect(screen.queryByTestId('client-app')).not.toBeInTheDocument()
    expect(screen.queryByTestId('master-home')).not.toBeInTheDocument()
  })

  it('сохраняет map-test override выше destination selector', async () => {
    const { default: App } = await loadApp({
      webAppStart: 'm-dest-token-123',
      initData: '',
      hash: '#/map-test',
    })

    render(<App />)

    expect(screen.getByTestId('map-test')).toBeInTheDocument()
    expect(screen.queryByTestId('destination-selector')).not.toBeInTheDocument()
  })
})

describe.sequential('App automatic mode detection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('показывает loading до ответа auto-detect', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post('*/api/auth/max', async () => {
        await gate
        return HttpResponse.json({ token: 'master-detected-token', role: 'master' })
      }),
    )
    const { default: App } = await loadApp({ initData: 'detect-init-data' })

    render(<App />)

    expect(screen.getByText('Загрузка...')).toBeInTheDocument()
    release?.()
    expect(await screen.findByTestId('master-home')).toBeInTheDocument()
  })

  it('определяет master, отправляет init_data и сохраняет token', async () => {
    let requestBody: object | null = null
    server.use(
      http.post('*/api/auth/max', async ({ request }) => {
        requestBody = await request.json() as object
        return HttpResponse.json({ token: 'master-detected-token', role: 'master' })
      }),
    )
    const { default: App } = await loadApp({ initData: 'detect-init-data' })

    render(<App />)

    expect(await screen.findByTestId('master-home')).toBeInTheDocument()
    expect(requestBody).toEqual({ init_data: 'detect-init-data' })
    expect(localStorage.getItem('masterToken')).toBe('master-detected-token')
    expect(window.WebApp?.ready).toHaveBeenCalledOnce()
  })

  it('выбирает client для non-master role без master token', async () => {
    server.use(
      http.post('*/api/auth/max', () => HttpResponse.json({ token: 'client-token', role: 'client' })),
    )
    const { default: App } = await loadApp({ initData: 'detect-init-data' })

    render(<App />)

    expect(await screen.findByTestId('client-app')).toBeInTheDocument()
    expect(localStorage.getItem('masterToken')).toBeNull()
  })

  it.each([
    ['non-ok response', () => HttpResponse.json({ error: 'invalid' }, { status: 401 })],
    ['network error', () => HttpResponse.error()],
  ])('выбирает client при %s', async (_name, response) => {
    server.use(http.post('*/api/auth/max', response))
    const { default: App } = await loadApp({ initData: 'detect-init-data' })

    render(<App />)

    expect(await screen.findByTestId('client-app')).toBeInTheDocument()
    expect(localStorage.getItem('masterToken')).toBeNull()
  })

  it('не вызывает auth endpoint без init data', async () => {
    const authRequest = vi.fn()
    server.use(
      http.post('*/api/auth/max', () => {
        authRequest()
        return HttpResponse.json({ token: 'unexpected', role: 'master' })
      }),
    )
    const { default: App } = await loadApp()

    render(<App />)

    expect(await screen.findByTestId('client-app')).toBeInTheDocument()
    expect(authRequest).not.toHaveBeenCalled()
  })

  it('не оставляет loading после auto-detect fallback', async () => {
    server.use(
      http.post('*/api/auth/max', () => HttpResponse.json({ error: 'invalid' }, { status: 403 })),
    )
    const { default: App } = await loadApp({ initData: 'detect-init-data' })

    render(<App />)

    await waitFor(() => expect(screen.queryByText('Загрузка...')).not.toBeInTheDocument())
    expect(screen.getByTestId('client-app')).toBeInTheDocument()
  })
})
