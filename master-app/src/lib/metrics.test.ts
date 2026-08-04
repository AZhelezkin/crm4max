import { beforeEach, describe, expect, test, vi } from 'vitest'

describe('metrics', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  test('emits events without a consent gate and filters undeclared parameters', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const metrics = await import('./metrics')

    metrics.trackEvent('app_opened', {
      app_mode: 'master',
      launch_source: 'bot',
      masterId: 'must-not-leak',
    } as never)

    expect(info).toHaveBeenCalledWith('[metrics]', 'app_opened', {
      app_mode: 'master',
      launch_source: 'bot',
    })
    expect(JSON.stringify(info.mock.calls)).not.toContain('must-not-leak')
  })

  test('deduplicates one-time events and StrictMode route effects', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const metrics = await import('./metrics')

    metrics.trackEventOnce('welcome', 'master_welcome_viewed', {})
    metrics.trackEventOnce('welcome', 'master_welcome_viewed', {})
    metrics.trackPageView('/bookings/123', 'master', 'same-navigation')
    metrics.trackPageView('/bookings/123', 'master', 'same-navigation')

    expect(info.mock.calls.filter((call) => call[1] === 'master_welcome_viewed')).toHaveLength(1)
    expect(info.mock.calls.filter((call) => call[1] === 'page_viewed')).toHaveLength(1)
  })

  test('normalizes dynamic routes and strips URL parameters', async () => {
    const { daysAheadBucket, metricAuthErrorType, metricPageUrl, normalizeMetricPath, priceBucket, resolveLaunchSource, timeBucket } = await import('./metrics')

    expect(normalizeMetricPath('/bookings/secret-id?token=secret')).toBe('/bookings/:id')
    expect(normalizeMetricPath('/income/2026-07-30')).toBe('/income/:date')
    expect(normalizeMetricPath('/my-bookings/secret-id#details')).toBe('/my-bookings/:id')
    expect(metricPageUrl('/', '/crm4max/', 'https://azhelezkin.github.io')).toBe('https://azhelezkin.github.io/crm4max/')
    expect(metricPageUrl('/bookings/:id', '/crm4max/', 'https://azhelezkin.github.io')).toBe('https://azhelezkin.github.io/crm4max/bookings/:id')
    expect(resolveLaunchSource('mmode')).toBe('bot')
    expect(resolveLaunchSource('qr')).toBe('qr')
    expect(resolveLaunchSource('private-id')).toBe('deeplink')
    expect(daysAheadBucket(5)).toBe('4_7')
    expect(timeBucket('19:30')).toBe('evening')
    expect(priceBucket(250_000)).toBe('1000_2999')
    expect(metricAuthErrorType({ response: { status: 401 } })).toBe('unauthorized')
  })
})
