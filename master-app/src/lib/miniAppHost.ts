export type MiniAppProvider = 'max' | 'telegram'

type TelegramWebApp = {
  initData?: string
  initDataUnsafe?: { start_param?: string }
  ready?: () => void
  expand?: () => void
  openLink?: (url: string) => void
  openTelegramLink?: (url: string) => void
  close?: () => void
  downloadFile?: (params: { url: string; file_name: string }) => void | Promise<unknown>
  disableVerticalSwipes?: () => void | Promise<unknown>
  enableVerticalSwipes?: () => void | Promise<unknown>
  isVerticalSwipesEnabled?: boolean
  BackButton?: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
    __MINI_APP_PROVIDER__?: MiniAppProvider
    __TELEGRAM_INIT_DATA__?: string
  }
}

export function miniAppProvider(): MiniAppProvider {
  return window.__MINI_APP_PROVIDER__ ?? 'max'
}

export function miniAppInitData(): string | undefined {
  return miniAppProvider() === 'telegram'
    ? window.__TELEGRAM_INIT_DATA__ || window.Telegram?.WebApp?.initData
    : window.WebApp?.initData
}

export type HostCapabilityOutcome<T = undefined> =
  | { status: 'completed'; value: T }
  | { status: 'unsupported' }
  | { status: 'failed'; error: unknown }

export type MiniAppHostCapabilities = Readonly<{
  lifecycle: boolean
  close: boolean
  nativeBack: boolean
  externalLinks: boolean
  messengerLinks: boolean
  download: boolean
  verticalSwipes: boolean
}>

export type NativeBackBinding = Readonly<{ visible: boolean; onBack: () => void }>

export interface MiniAppHostAdapter {
  readonly provider: MiniAppProvider | 'browser'
  readonly capabilities: MiniAppHostCapabilities
  ready(): HostCapabilityOutcome
  close(): HostCapabilityOutcome
  openLink(url: string): HostCapabilityOutcome
  openMessengerLink(url: string): HostCapabilityOutcome
  download(url: string, filename: string): HostCapabilityOutcome | Promise<HostCapabilityOutcome>
  setVerticalSwipes(allow: boolean): Promise<HostCapabilityOutcome<boolean>>
  bindNativeBack(binding: NativeBackBinding): HostCapabilityOutcome<() => void>
}

const completed = <T = undefined>(value = undefined as T): HostCapabilityOutcome<T> => ({ status: 'completed', value })
const unsupported = <T = undefined>(): HostCapabilityOutcome<T> => ({ status: 'unsupported' })
const failed = <T = undefined>(error: unknown): HostCapabilityOutcome<T> => ({ status: 'failed', error })

function invoke(operation: (() => void) | undefined): HostCapabilityOutcome {
  if (!operation) return unsupported()
  try {
    operation()
    return completed()
  } catch (error) {
    return failed(error)
  }
}

function openBrowserLink(url: string): HostCapabilityOutcome {
  try {
    window.open(url, '_blank', 'noopener,noreferrer')
    return completed()
  } catch (error) {
    return failed(error)
  }
}

const browserAdapter: MiniAppHostAdapter = {
  provider: 'browser',
  capabilities: Object.freeze({ lifecycle: false, close: false, nativeBack: false, externalLinks: true, messengerLinks: false, download: false, verticalSwipes: false }),
  ready: unsupported,
  close: unsupported,
  openLink: openBrowserLink,
  openMessengerLink: openBrowserLink,
  download: openBrowserLink,
  setVerticalSwipes: async () => unsupported(),
  bindNativeBack: () => unsupported(),
}

const maxAdapter: MiniAppHostAdapter = {
  provider: 'max',
  get capabilities() {
    const webApp = window.WebApp
    return Object.freeze({
      lifecycle: typeof webApp?.ready === 'function',
      close: typeof webApp?.close === 'function',
      nativeBack: false,
      externalLinks: typeof webApp?.openLink === 'function',
      messengerLinks: typeof webApp?.openMaxLink === 'function',
      download: typeof webApp?.downloadFile === 'function',
      verticalSwipes: typeof webApp?.disableVerticalSwipes === 'function' || typeof webApp?.enableVerticalSwipes === 'function',
    })
  },
  ready: () => invoke(window.WebApp?.ready ? () => window.WebApp!.ready() : undefined),
  close: () => invoke(window.WebApp?.close ? () => window.WebApp!.close!() : undefined),
  openLink(url) {
    return window.WebApp?.openLink ? invoke(() => window.WebApp!.openLink(url)) : browserAdapter.openLink(url)
  },
  openMessengerLink(url) {
    if (window.WebApp?.openMaxLink) return invoke(() => window.WebApp!.openMaxLink(url))
    return this.openLink(url)
  },
  download(url, filename) {
    const method = window.WebApp?.downloadFile
    if (!method) return this.openLink(url)
    try {
      const result = method.call(window.WebApp, url, filename)
      if (result && typeof result.then === 'function') {
        return result.then(() => completed(), failed)
      }
      return completed()
    } catch (error) {
      return failed(error)
    }
  },
  async setVerticalSwipes(allow) {
    const webApp = window.WebApp
    const method = allow ? webApp?.enableVerticalSwipes : webApp?.disableVerticalSwipes
    if (!method) return unsupported()
    try {
      const result = await method.call(webApp)
      return completed(result?.allowVerticalSwipes ?? allow)
    } catch (error) {
      return failed(error)
    }
  },
  bindNativeBack: () => unsupported(),
}

const telegramAdapter: MiniAppHostAdapter = {
  provider: 'telegram',
  get capabilities() {
    const webApp = window.Telegram?.WebApp
    return Object.freeze({
      lifecycle: typeof webApp?.ready === 'function',
      close: typeof webApp?.close === 'function',
      nativeBack: Boolean(webApp?.BackButton),
      externalLinks: typeof webApp?.openLink === 'function',
      messengerLinks: typeof webApp?.openTelegramLink === 'function',
      download: typeof webApp?.downloadFile === 'function',
      verticalSwipes: typeof webApp?.disableVerticalSwipes === 'function' || typeof webApp?.enableVerticalSwipes === 'function',
    })
  },
  ready() {
    const webApp = window.Telegram?.WebApp
    if (!webApp?.ready) return unsupported()
    try {
      webApp.ready()
      webApp.expand?.()
      return completed()
    } catch (error) {
      return failed(error)
    }
  },
  close: () => invoke(window.Telegram?.WebApp?.close),
  openLink(url) {
    const webApp = window.Telegram?.WebApp
    if (/^https?:\/\/(?:t\.me|telegram\.me)\//i.test(url) && webApp?.openTelegramLink) {
      return invoke(() => webApp.openTelegramLink!(url))
    }
    return webApp?.openLink ? invoke(() => webApp.openLink!(url)) : browserAdapter.openLink(url)
  },
  openMessengerLink(url) {
    const method = window.Telegram?.WebApp?.openTelegramLink
    return method ? invoke(() => method(url)) : this.openLink(url)
  },
  download(url, filename) {
    const method = window.Telegram?.WebApp?.downloadFile
    if (!method) return this.openLink(url)
    try {
      const result = method({ url, file_name: filename })
      if (result && typeof result.then === 'function') return result.then(() => completed(), failed)
      return completed()
    } catch (error) {
      return failed(error)
    }
  },
  async setVerticalSwipes(allow) {
    const webApp = window.Telegram?.WebApp
    const method = allow ? webApp?.enableVerticalSwipes : webApp?.disableVerticalSwipes
    if (!method) return unsupported()
    try {
      await method.call(webApp)
      return completed(allow)
    } catch (error) {
      return failed(error)
    }
  },
  bindNativeBack({ visible, onBack }) {
    const backButton = window.Telegram?.WebApp?.BackButton
    if (!backButton) return unsupported()
    try {
      backButton.offClick(onBack)
      backButton.onClick(onBack)
      if (visible) backButton.show()
      else backButton.hide()
      return completed(() => {
        backButton.offClick(onBack)
        backButton.hide()
      })
    } catch (error) {
      return failed(error)
    }
  },
}

export function miniAppHost(): MiniAppHostAdapter {
  if (miniAppProvider() === 'telegram') return window.Telegram?.WebApp ? telegramAdapter : browserAdapter
  return window.WebApp ? maxAdapter : browserAdapter
}

let readyOutcome: HostCapabilityOutcome | null = null

export function readyMiniApp(): HostCapabilityOutcome {
  if (!readyOutcome || readyOutcome.status === 'failed') readyOutcome = miniAppHost().ready()
  return readyOutcome
}

export function openMiniAppLink(url: string): HostCapabilityOutcome {
  return miniAppHost().openLink(url)
}

export function openMiniAppMessengerLink(url: string): HostCapabilityOutcome {
  return miniAppHost().openMessengerLink(url)
}

export function closeMiniApp(): boolean {
  return miniAppHost().close().status === 'completed'
}

export function setMiniAppVerticalSwipes(allow: boolean): Promise<HostCapabilityOutcome<boolean>> {
  return miniAppHost().setVerticalSwipes(allow)
}

export function bindMiniAppNativeBack(binding: NativeBackBinding): HostCapabilityOutcome<() => void> {
  return miniAppHost().bindNativeBack(binding)
}

export function miniAppVerticalSwipesEnabled(): boolean | undefined {
  return miniAppProvider() === 'telegram'
    ? window.Telegram?.WebApp?.isVerticalSwipesEnabled
    : window.WebApp?.isVerticalSwipesEnabled
}

export function downloadMiniAppFile(url: string, filename: string): HostCapabilityOutcome | Promise<HostCapabilityOutcome> {
  return miniAppHost().download(url, filename)
}

export function resetMiniAppHostForTests(): void {
  readyOutcome = null
}

export function masterTokenKey(): 'masterToken' | 'telegramMasterToken' {
  return miniAppProvider() === 'telegram' ? 'telegramMasterToken' : 'masterToken'
}

export function readMasterToken(): string | null {
  return localStorage.getItem(masterTokenKey())
}

export function writeMasterToken(token: string): void {
  localStorage.setItem(masterTokenKey(), token)
}

export function removeMasterToken(): void {
  localStorage.removeItem(masterTokenKey())
}

export type DynamicMaxMasterBookingLaunch = { param: string; bookingId: string; source: 'query' | 'bridge' }

export function resolveDynamicMaxMasterBookingLaunch(pattern: RegExp): DynamicMaxMasterBookingLaunch | null {
  if (miniAppProvider() !== 'max') return null
  const queryParam = new URLSearchParams(window.location.search).get('startapp') ?? ''
  const bridgeParam = window.WebApp?.initDataUnsafe?.start_param ?? ''
  for (const [param, source] of [[queryParam, 'query'], [bridgeParam, 'bridge']] as const) {
    const match = pattern.exec(param)
    if (match) return { param, bookingId: match[2], source }
  }
  return null
}
