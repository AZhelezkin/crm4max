import { parseDestinationSelectorStartParam } from '@/standalone-pages/handoff/destination-selector/route'

export type MiniAppLaunchContext = Readonly<{
  provider: 'max' | 'telegram'
  appMode: 'master' | 'client' | 'detect' | 'invalid'
  startParam: string | null
  startParamSource: 'max-sdk' | 'telegram-sdk' | 'telegram-fragment' | 'query-startapp' | 'query-master-id' | 'none'
  initData: string
  authEndpoint: '/auth/max' | '/auth/telegram'
  authRole: 'master' | 'client' | null
  tokenKey: 'masterToken' | 'telegramMasterToken' | 'clientToken'
}>

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_PART = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
export const CLIENT_BOOKING_DEEPLINK_RE = new RegExp(`^(${UUID_PART})-(${UUID_PART})$`, 'i')
export const MASTER_BOOKING_DEEPLINK_RE = new RegExp(`^m-(${UUID_PART})-(${UUID_PART})$`, 'i')
export const PROFILE_LINK_START_PARAM_RE = /^pl_[A-Za-z0-9_-]{32}$/

export function parseProfileLinkStartParam(startParam: string | null): string | null {
  return startParam && PROFILE_LINK_START_PARAM_RE.test(startParam) ? startParam : null
}

let launchContext: MiniAppLaunchContext | undefined

function maxMode(startParam: string): MiniAppLaunchContext['appMode'] {
  if (startParam === 'mmode' || startParam === 'msubscription' || MASTER_BOOKING_DEEPLINK_RE.test(startParam)) return 'master'
  if (startParam === 'cmasters' || UUID_RE.test(startParam) || CLIENT_BOOKING_DEEPLINK_RE.test(startParam)) return 'client'
  if (parseDestinationSelectorStartParam(startParam) || startParam === 'swipetest') return 'master'
  return 'detect'
}

export function createMaxLaunchContext(): MiniAppLaunchContext {
  const sdkStart = window.WebApp?.initDataUnsafe?.start_param
  const query = new URLSearchParams(window.location.search)
  const startapp = query.get('startapp')
  const masterId = query.get('masterId')
  const startParam = sdkStart || startapp || masterId || ''
  const source = sdkStart
    ? 'max-sdk'
    : startapp
      ? 'query-startapp'
      : masterId
        ? 'query-master-id'
        : 'none'

  return Object.freeze({
    provider: 'max',
    appMode: maxMode(startParam),
    startParam: startParam || null,
    startParamSource: source,
    initData: window.WebApp?.initData ?? '',
    authEndpoint: '/auth/max',
    authRole: maxMode(startParam) === 'client' ? 'client' : maxMode(startParam) === 'master' ? 'master' : null,
    tokenKey: maxMode(startParam) === 'client' ? 'clientToken' : 'masterToken',
  })
}

export function createTelegramLaunchContext(fragment: URLSearchParams): MiniAppLaunchContext {
  const sdkStart = window.Telegram?.WebApp?.initDataUnsafe?.start_param
  const fragmentStart = fragment.get('tgWebAppStartParam')
  const queryStart = new URLSearchParams(window.location.search).get('startapp')
  const queryTarget = queryStart === 'mmode' || parseProfileLinkStartParam(queryStart) ? queryStart : ''
  const startParam = sdkStart || fragmentStart || queryTarget
  return Object.freeze({
    provider: 'telegram',
    appMode: startParam === 'mmode' ? 'master' : 'invalid',
    startParam: startParam || null,
    startParamSource: sdkStart ? 'telegram-sdk' : fragmentStart ? 'telegram-fragment' : startParam ? 'query-startapp' : 'none',
    initData: window.Telegram?.WebApp?.initData || fragment.get('tgWebAppData') || '',
    authEndpoint: '/auth/telegram',
    authRole: startParam === 'mmode' ? 'master' : null,
    tokenKey: 'telegramMasterToken',
  })
}

export function initializeLaunchContext(context: MiniAppLaunchContext): MiniAppLaunchContext {
  launchContext ??= context
  return launchContext
}

export function getLaunchContext(): MiniAppLaunchContext {
  if (launchContext) return launchContext
  if (window.__MINI_APP_PROVIDER__ === 'telegram') {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const context = createTelegramLaunchContext(fragment)
    if (!context.initData && window.__TELEGRAM_INIT_DATA__) {
      return initializeLaunchContext(Object.freeze({ ...context, initData: window.__TELEGRAM_INIT_DATA__ }))
    }
    return initializeLaunchContext(context)
  }
  return initializeLaunchContext(createMaxLaunchContext())
}

export function resetLaunchContextForTests(): void {
  launchContext = undefined
}
