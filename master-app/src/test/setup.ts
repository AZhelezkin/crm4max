import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

import { resetBrowserFixture } from './browser-fixture'
import { server } from './msw/server'
import {
  clearTestStorage,
  installTestStorageGlobals,
  resetApplicationStores,
} from './storage'
import { removeWebApp } from './web-app-fixture'
import { resetMiniAppHostForTests } from '@/lib/miniAppHost'

installTestStorageGlobals()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(async () => {
  cleanup()
  server.resetHandlers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  installTestStorageGlobals()
  resetBrowserFixture()
  removeWebApp()
  resetMiniAppHostForTests()
  delete window.Telegram
  delete window.__MINI_APP_PROVIDER__
  delete window.__TELEGRAM_INIT_DATA__
  await resetApplicationStores()
  clearTestStorage()
  document.body.className = ''
  document.documentElement.removeAttribute('data-theme')
  window.history.replaceState(null, '', '/')
})

afterAll(() => {
  server.close()
})
