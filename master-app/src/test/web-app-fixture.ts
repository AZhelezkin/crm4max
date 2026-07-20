import { vi } from 'vitest'
import type { Mock } from 'vitest'

export type CodeReaderResult = string | { data?: string; result?: string; text?: string }

export interface WebAppFixture {
  ready: Mock<() => void>
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name: string; username?: string }
    start_param?: string
  }
  requestContact: Mock<() => Promise<{ phone_number: string }>>
  shareContent: Mock<(params: { text: string }) => void>
  openLink: Mock<(url: string) => void>
  openMaxLink: Mock<(url: string) => void>
  openCodeReader: Mock<(fileSelect: boolean) => Promise<CodeReaderResult>>
  downloadFile: Mock<(url: string, fileName: string) => void | Promise<void | { status?: string }>>
  close: Mock<() => void>
}

export function installWebApp(overrides: Partial<WebAppFixture> = {}): WebAppFixture {
  const fixture: WebAppFixture = {
    ready: vi.fn(),
    initData: 'signed-max-init-data',
    initDataUnsafe: {
      user: {
        id: 100_001,
        first_name: 'Тест',
        last_name: 'Пользователь',
        username: 'test_user',
      },
    },
    requestContact: vi.fn().mockResolvedValue({ phone_number: '+79990000000' }),
    shareContent: vi.fn(),
    openLink: vi.fn(),
    openMaxLink: vi.fn(),
    openCodeReader: vi.fn().mockResolvedValue(''),
    downloadFile: vi.fn(),
    close: vi.fn(),
    ...overrides,
  }

  Object.defineProperty(window, 'WebApp', {
    configurable: true,
    writable: true,
    value: fixture,
  })

  return fixture
}

export function removeWebApp() {
  Reflect.deleteProperty(window, 'WebApp')
}
