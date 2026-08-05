export type AppMode = 'master' | 'client'
export type LaunchSource = 'bot' | 'deeplink' | 'qr' | 'direct'
export type ClientMasterSource = 'deeplink' | 'qr' | 'recent' | 'stored'
export type PriceBucket = 'lt_1000' | '1000_2999' | '3000_4999' | 'gte_5000'

type MetricValue = string | number | boolean

export type MetricEventMap = {
  app_opened: { app_mode: AppMode; launch_source: LaunchSource }
  auth_completed: { app_mode: AppMode; is_new_user: boolean }
  auth_failed: { app_mode: AppMode; error_type: 'max_unavailable' | 'unauthorized' | 'network' | 'unknown' }
  master_welcome_viewed: Record<string, never>
  subscription_viewed: Record<string, never>
  subscription_checkout_started: { period: 'month' | 'year' }
  subscription_payment_redirected: { period: 'month' | 'year'; form: 'payment' | 'card_binding' }
  subscription_cancelled: Record<string, never>
  subscription_payment_returned: { result: 'success' | 'fail' }
  master_booking_created: { booking_type: 'regular'; services_count: number; has_address: boolean; remind: boolean; has_overlap: boolean }
  master_package_created: { sessions_count: number; has_address: boolean; remind: boolean }
  master_booking_create_failed: { booking_type: 'regular' | 'package'; error_type: 'conflict' | 'validation' | 'network' | 'unknown' }
  client_master_opened: { source: ClientMasterSource }
  client_qr_scan_started: Record<string, never>
  client_qr_scan_completed: { result: 'valid' | 'invalid' | 'cancelled' }
  client_booking_started: { entry: 'master' | 'service' }
  client_service_selected: { has_discount: boolean; is_package: boolean; price_bucket: PriceBucket }
  client_service_details_viewed: { is_package: boolean; has_photos: boolean }
  client_booking_date_selected: { days_ahead_bucket: 'today' | '1_3' | '4_7' | '8_30' | 'gt_30' }
  client_booking_time_selected: { time_bucket: 'morning' | 'day' | 'evening' }
  client_booking_confirmed: { has_address: boolean; remind: boolean; has_deposit: boolean }
  client_package_confirmed: { sessions_count: number; has_address: boolean; remind: boolean }
  client_booking_create_failed: { booking_type: 'regular' | 'package'; error_type: 'conflict' | 'validation' | 'network' | 'unknown' }
  client_booking_rescheduled: Record<string, never>
  client_deposit_started: { amount_bucket: PriceBucket }
  share_page_opened: Record<string, never>
  share_link_copied: { source: 'button' | 'fallback' }
  share_link_sent: { provider: 'system' }
  share_qr_downloaded: Record<string, never>
}

export type MetricEventName = keyof MetricEventMap

type YmFunction = ((counterId: number, method: string, ...args: unknown[]) => void) & {
  a?: unknown[][]
  l?: number
}

declare global {
  interface Window {
    ym?: YmFunction
  }
}

const COUNTER_ID = parseCounterId(import.meta.env.VITE_YANDEX_METRICA_ID)
const QUEUE_LIMIT = 50
const ONCE_LIMIT = 200
const SCRIPT_ID = 'yandex-metrika-tag'
const IS_LOCAL = import.meta.env.DEV || import.meta.env.MODE === 'test'

const EVENT_KEYS: { [Name in MetricEventName]: readonly (keyof MetricEventMap[Name])[] } = {
  app_opened: ['app_mode', 'launch_source'],
  auth_completed: ['app_mode', 'is_new_user'],
  auth_failed: ['app_mode', 'error_type'],
  master_welcome_viewed: [],
  subscription_viewed: [],
  subscription_checkout_started: ['period'],
  subscription_payment_redirected: ['period', 'form'],
  subscription_cancelled: [],
  subscription_payment_returned: ['result'],
  master_booking_created: ['booking_type', 'services_count', 'has_address', 'remind', 'has_overlap'],
  master_package_created: ['sessions_count', 'has_address', 'remind'],
  master_booking_create_failed: ['booking_type', 'error_type'],
  client_master_opened: ['source'],
  client_qr_scan_started: [],
  client_qr_scan_completed: ['result'],
  client_booking_started: ['entry'],
  client_service_selected: ['has_discount', 'is_package', 'price_bucket'],
  client_service_details_viewed: ['is_package', 'has_photos'],
  client_booking_date_selected: ['days_ahead_bucket'],
  client_booking_time_selected: ['time_bucket'],
  client_booking_confirmed: ['has_address', 'remind', 'has_deposit'],
  client_package_confirmed: ['sessions_count', 'has_address', 'remind'],
  client_booking_create_failed: ['booking_type', 'error_type'],
  client_booking_rescheduled: [],
  client_deposit_started: ['amount_bucket'],
  share_page_opened: [],
  share_link_copied: ['source'],
  share_link_sent: ['provider'],
  share_qr_downloaded: [],
}

let initialized = false
let lastPageNavigation = ''
const sentOnce = new Set<string>()

export function trackEvent<Name extends MetricEventName>(name: Name, params: MetricEventMap[Name]): void {
  const safeParams = sanitizeParams(params, EVENT_KEYS[name] as readonly string[])
  if (IS_LOCAL) {
    console.info('[metrics]', name, safeParams)
    return
  }
  initializeMetrics()
  safelyCallYm('reachGoal', name, safeParams)
}

export function setAnalyticsUserId(analyticsUserId: string | null | undefined): void {
  if (typeof analyticsUserId !== 'string' || !analyticsUserId.trim()) return
  const normalizedUserId = analyticsUserId.trim()
  initializeMetrics()
  safelyCallYm('setUserID', normalizedUserId)
}

export function trackEventOnce<Name extends MetricEventName>(key: string, name: Name, params: MetricEventMap[Name]): void {
  if (sentOnce.has(key)) return
  sentOnce.add(key)
  if (sentOnce.size > ONCE_LIMIT) sentOnce.delete(sentOnce.values().next().value!)
  trackEvent(name, params)
}

export function trackPageView(path: string, appMode: AppMode, navigationKey = path): void {
  const page = normalizeMetricPath(path)
  const dedupeKey = `${appMode}:${navigationKey}:${page}`
  if (dedupeKey === lastPageNavigation) return
  lastPageNavigation = dedupeKey
  const params = { app_mode: appMode, page }
  if (IS_LOCAL) {
    console.info('[metrics]', 'page_viewed', params)
    return
  }
  initializeMetrics()
  safelyCallYm('hit', metricPageUrl(page), { params })
}

export function metricPageUrl(path: string, basePath = import.meta.env.BASE_URL, origin = window.location.origin): string {
  const baseUrl = new URL(basePath.endsWith('/') ? basePath : `${basePath}/`, origin)
  return new URL(path.replace(/^\/+/, ''), baseUrl).href
}

export function normalizeMetricPath(value: string): string {
  const path = value.split(/[?#]/, 1)[0] || '/'
  if (/^\/bookings\/[^/]+$/.test(path)) return '/bookings/:id'
  if (/^\/income\/[^/]+$/.test(path)) return '/income/:date'
  if (/^\/my-bookings\/[^/]+$/.test(path)) return '/my-bookings/:id'
  return path.startsWith('/') ? path : `/${path}`
}

export function resolveLaunchSource(startParam: string): LaunchSource {
  if (!startParam) return 'direct'
  if (startParam === 'qr') return 'qr'
  if (startParam === 'mmode' || startParam === 'msubscription' || startParam === 'cmasters' || startParam.startsWith('m-')) return 'bot'
  return 'deeplink'
}

export function metricErrorType(error: unknown): 'conflict' | 'validation' | 'network' | 'unknown' {
  const response = (error as { response?: { status?: number; data?: { slot?: unknown } } } | null)?.response
  if (response?.status === 409 || response?.data?.slot) return 'conflict'
  if (response?.status === 400 || response?.status === 422) return 'validation'
  if (!response?.status) return 'network'
  return 'unknown'
}

export function daysAheadBucket(days: number): 'today' | '1_3' | '4_7' | '8_30' | 'gt_30' {
  if (days <= 0) return 'today'
  if (days <= 3) return '1_3'
  if (days <= 7) return '4_7'
  if (days <= 30) return '8_30'
  return 'gt_30'
}

export function timeBucket(time: string): 'morning' | 'day' | 'evening' {
  const hour = Number(time.slice(0, 2))
  if (Number.isFinite(hour) && hour < 12) return 'morning'
  if (Number.isFinite(hour) && hour < 18) return 'day'
  return 'evening'
}

export function priceBucket(amountKopecks: number): PriceBucket {
  if (amountKopecks < 100_000) return 'lt_1000'
  if (amountKopecks < 300_000) return '1000_2999'
  if (amountKopecks < 500_000) return '3000_4999'
  return 'gte_5000'
}

export function metricAuthErrorType(error: unknown): 'max_unavailable' | 'unauthorized' | 'network' | 'unknown' {
  if (error instanceof Error && error.message === 'MAX WebApp unavailable') return 'max_unavailable'
  const status = (error as { response?: { status?: number } } | null)?.response?.status
  if (status === 401 || status === 403) return 'unauthorized'
  if (!status) return 'network'
  return 'unknown'
}

function initializeMetrics(): void {
  if (initialized || !COUNTER_ID || typeof document === 'undefined' || IS_LOCAL) return
  try {
    initialized = true
    installBoundedYmQueue()
    safelyCallYm('init', {
      // Automatic click/link capture can include deep-link IDs and full URLs.
      clickmap: false,
      trackLinks: false,
      accurateTrackBounce: true,
      webvisor: false,
      defer: true,
    })
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.async = true
      script.src = 'https://mc.yandex.ru/metrika/tag.js'
      document.head.appendChild(script)
    }
  } catch {
    initialized = false
  }
}

function installBoundedYmQueue(): void {
  if (window.ym) return
  const queued: YmFunction = (...args: unknown[]) => {
    const queue = queued.a ?? (queued.a = [])
    queue.push(args)
    if (queue.length > QUEUE_LIMIT) queue.shift()
  }
  queued.l = Date.now()
  window.ym = queued
}

function safelyCallYm(method: string, ...args: unknown[]): void {
  if (!COUNTER_ID) return
  try {
    if (!window.ym) return
    window.ym(COUNTER_ID, method, ...args)
  } catch {
    // Analytics must never affect application behavior.
  }
}

function sanitizeParams(value: object, allowedKeys: readonly string[]): Record<string, MetricValue> {
  const source = value as Record<string, unknown>
  return Object.fromEntries(allowedKeys.flatMap((key) => {
    const item = source[key]
    return typeof item === 'string' || typeof item === 'boolean' || (typeof item === 'number' && Number.isSafeInteger(item) && item >= 0)
      ? [[key, item]]
      : []
  }))
}

function parseCounterId(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : NaN
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}
