declare global {
  interface Window {
    __TELEGRAM_INIT_DATA__?: string
  }
}

import { createTelegramLaunchContext, initializeLaunchContext } from '@/lib/launchContext'
import { readyMiniApp } from '@/lib/miniAppHost'

window.__MINI_APP_PROVIDER__ = 'telegram'

const launchParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
const launchContext = initializeLaunchContext(createTelegramLaunchContext(launchParams))
window.__TELEGRAM_INIT_DATA__ = launchContext.initData || undefined

readyMiniApp()

for (const key of [...launchParams.keys()]) {
  if (key.startsWith('tgWebApp')) launchParams.delete(key)
}
if (window.location.hash.includes('tgWebApp')) {
  const hash = launchParams.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : '#/'}`)
}

void import('./telegram-render')
