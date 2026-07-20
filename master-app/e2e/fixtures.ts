import { expect, test as base } from '@playwright/test'
import type { Page, Request } from '@playwright/test'

interface MockResponse {
  status?: number
  body?: unknown
  headers?: Record<string, string>
}

type RequestHandler = (request: Request) => MockResponse | undefined | Promise<MockResponse | undefined>

export class ApiMock {
  readonly calls: Request[] = []
  readonly unexpected: string[] = []
  readonly #handlers: RequestHandler[] = []

  use(handler: RequestHandler) {
    this.#handlers.push(handler)
  }

  respond(method: string, path: string, body: unknown, status = 200) {
    this.use((request) => {
      const url = new URL(request.url())
      if (request.method() !== method.toUpperCase() || url.pathname !== path) return undefined
      return { status, body }
    })
  }

  callsFor(method: string, path: string) {
    return this.calls.filter((request) => {
      const url = new URL(request.url())
      return request.method() === method.toUpperCase() && url.pathname === path
    })
  }

  async handle(request: Request) {
    this.calls.push(request)
    for (let index = this.#handlers.length - 1; index >= 0; index -= 1) {
      const response = await this.#handlers[index](request)
      if (response) return response
    }
    this.unexpected.push(`${request.method()} ${request.url()}`)
    return undefined
  }
}

export const test = base.extend<{ api: ApiMock }>({
  api: async ({ page }, use) => {
    const api = new ApiMock()
    await page.route('**/*', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin === 'http://127.0.0.1:4173' && url.pathname.startsWith('/api/')) {
        const response = await api.handle(request)
        if (!response) {
          await route.abort('blockedbyclient')
          return
        }
        await route.fulfill({
          status: response.status ?? 200,
          contentType: 'application/json',
          headers: response.headers,
          body: JSON.stringify(response.body ?? null),
        })
        return
      }
      if (request.url() === 'https://st.max.ru/js/max-web-app.js') {
        await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
        return
      }
      if (url.origin === 'https://fonts.googleapis.com') {
        await route.fulfill({ status: 200, contentType: 'text/css', body: '' })
        return
      }
      if (
        url.origin === 'http://127.0.0.1:4173'
        && (url.pathname === '/crm4max' || url.pathname.startsWith('/crm4max/'))
      ) {
        await route.continue()
        return
      }
      api.unexpected.push(`${request.method()} ${request.url()}`)
      await route.abort('blockedbyclient')
    })

    await use(api)
    expect(api.unexpected, `Unexpected network requests:\n${api.unexpected.join('\n')}`).toEqual([])
  },
})

export { expect }

export const MASTER_ID = '10000000-0000-4000-8000-000000000001'
export const CLIENT_ID = '20000000-0000-4000-8000-000000000002'
export const BOOKING_ID = '30000000-0000-4000-8000-000000000003'
export const SERVICE_ID = '40000000-0000-4000-8000-000000000004'
export const MASTER_CLIENT_ID = '50000000-0000-4000-8000-000000000005'

export const masterService = {
  id: SERVICE_ID,
  name: 'Стрижка',
  description: 'Тестовая услуга',
  duration: 60,
  price: 250_000,
  discountPercent: null,
  sessionsCount: 1,
  photo: null,
  isActive: true,
  workPhotos: [],
}

export const masterProfile = {
  id: MASTER_ID,
  name: 'Анна Мастерова',
  photo: null,
  description: 'Тестовый профиль мастера',
  contacts: '@anna_test',
  phone: '+79990000001',
  location: 'Москва, Тестовая улица, 1',
  locationNote: 'Вход со двора',
  lat: 55.7558,
  lng: 37.6176,
  rating: 4.9,
  cardNumber: null,
  vkPayLinked: false,
  homeVisit: false,
  isOnboarded: true,
  schedule: {
    workingDays: [1, 2, 3, 4, 5, 6, 7],
    startTime: '09:00',
    endTime: '18:00', breakStart: null, breakEnd: null, bufferMinutes: 0,
  },
  services: [masterService],
}

export const clientMaster = {
  id: MASTER_ID,
  name: 'Анна Мастерова',
  photo: null,
  description: 'Тестовый профиль мастера',
  phone: '+79990000001',
  location: 'Москва, Тестовая улица, 1',
  lat: 55.7558,
  lng: 37.6176,
  rating: 4.9,
  homeVisit: false,
  maxProfileLink: 'https://max.ru/anna_test',
  timezone: 'Europe/Moscow',
  blocked: false,
  schedule: masterProfile.schedule,
  services: [masterService],
  reviews: [],
}

export const masterClient = {
  id: MASTER_CLIENT_ID,
  clientId: CLIENT_ID,
  name: 'Ирина Клиентова',
  phone: '+79990000002',
  photo: null,
  notes: null,
  isMaxUser: true,
  createdAt: '2026-07-01T00:00:00.000Z',
}

export function clientBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    date: '2030-01-10',
    time: '10:00',
    status: 'CONFIRMED',
    paymentStatus: 'UNPAID',
    notes: null,
    price: null,
    remind: true,
    clientAddress: null,
    master: {
      id: MASTER_ID,
      name: clientMaster.name,
      photo: null,
      location: clientMaster.location,
      description: clientMaster.description,
      rating: clientMaster.rating,
      lat: clientMaster.lat,
      lng: clientMaster.lng,
      maxProfileLink: clientMaster.maxProfileLink,
      timezone: clientMaster.timezone,
    },
    client: { id: CLIENT_ID, name: 'Ирина Клиентова', photo: null },
    service: masterService,
    services: [],
    review: null,
    ...overrides,
  }
}

export function masterBooking(overrides: Record<string, unknown> = {}) {
  return {
    ...clientBooking(),
    master: {
      id: MASTER_ID,
      name: masterProfile.name,
      photo: null,
      location: masterProfile.location,
      lat: masterProfile.lat,
      lng: masterProfile.lng,
    },
    client: { id: CLIENT_ID, name: 'Ирина Клиентова', phone: '+79990000002', photo: null },
    payments: [],
    ...overrides,
  }
}

export async function seedStorage(page: Page, options: {
  master?: boolean
  client?: boolean
  session?: Record<string, string>
} = {}) {
  await page.addInitScript(({ master, client, session }) => {
    if (master) localStorage.setItem('masterToken', 'e2e-master-token')
    if (client) {
      localStorage.setItem('clientToken', 'e2e-client-token')
      localStorage.setItem('clientId', '20000000-0000-4000-8000-000000000002')
    }
    for (const [key, value] of Object.entries(session ?? {})) sessionStorage.setItem(key, value)
  }, options)
}

export async function installMaxWebApp(page: Page, options: {
  startParam?: string
  initData?: string
  codeResult?: string
} = {}) {
  await page.addInitScript(({ startParam, initData, codeResult }) => {
    const calls = {
      ready: 0,
      close: 0,
      openLink: [] as string[],
      openMaxLink: [] as string[],
      shareContent: [] as Array<{ text: string }>,
      downloadFile: [] as Array<[string, string]>,
      openCodeReader: 0,
      windowOpen: [] as Array<[string, string | undefined]>,
      clipboard: [] as string[],
      share: [] as ShareData[],
    }
    ;(window as typeof window & { __e2ePlatformCalls: typeof calls }).__e2ePlatformCalls = calls
    ;(window as typeof window & { WebApp: unknown }).WebApp = {
      initData: initData ?? 'signed-e2e-init-data',
      initDataUnsafe: { start_param: startParam },
      ready: () => { calls.ready += 1 },
      close: () => { calls.close += 1 },
      openLink: (url: string) => { calls.openLink.push(url) },
      openMaxLink: (url: string) => { calls.openMaxLink.push(url) },
      shareContent: (value: { text: string }) => { calls.shareContent.push(value) },
      downloadFile: (url: string, fileName: string) => { calls.downloadFile.push([url, fileName]) },
      openCodeReader: async () => {
        calls.openCodeReader += 1
        return codeResult ?? ''
      },
      requestContact: async () => ({ phone_number: '+79990000000' }),
    }
  }, options)
}

export async function installBrowserCapabilities(page: Page) {
  await page.addInitScript(() => {
    const calls = {
      ready: 0,
      close: 0,
      openLink: [] as string[],
      openMaxLink: [] as string[],
      shareContent: [] as Array<{ text: string }>,
      downloadFile: [] as Array<[string, string]>,
      openCodeReader: 0,
      windowOpen: [] as Array<[string, string | undefined]>,
      clipboard: [] as string[],
      share: [] as ShareData[],
    }
    ;(window as typeof window & { __e2ePlatformCalls: typeof calls }).__e2ePlatformCalls = calls
    window.open = ((url?: string | URL, target?: string) => {
      calls.windowOpen.push([String(url ?? ''), target])
      return null
    }) as typeof window.open
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { calls.clipboard.push(text) } },
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => { calls.share.push(data) },
    })
    URL.createObjectURL = () => 'blob:e2e-download'
    URL.revokeObjectURL = () => undefined
  })
}

export function installMasterApi(api: ApiMock) {
  api.respond('POST', '/api/auth/max', { token: 'e2e-master-token', userId: MASTER_ID, role: 'master' })
  api.respond('GET', '/api/masters/me', masterProfile)
  api.respond('GET', '/api/clients', [masterClient])
  api.respond('GET', '/api/bookings', [])
  api.respond('GET', '/api/subscription/me', {
    status: 'ACTIVE', trialEndsAt: null, currentPeriodEnd: '2030-01-01T00:00:00.000Z',
    graceEndsAt: null, cardPan: '2200••••1234', lastChargeError: null, hasAccess: true,
  })
  api.respond('POST', '/api/subscription/pay', { paymentURL: 'https://pay.test/subscription' })
  api.respond('GET', '/api/services', [masterService])
}

export function installClientApi(api: ApiMock) {
  api.respond('POST', '/api/auth/max', { token: 'e2e-client-token', userId: CLIENT_ID, role: 'client' })
  api.respond('GET', `/api/masters/${MASTER_ID}`, clientMaster)
  api.respond('GET', '/api/bookings', [])
  api.respond('GET', '/api/masters/recent', [{
    id: MASTER_ID, name: clientMaster.name, photo: null, description: clientMaster.description,
  }])
}
