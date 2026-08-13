import { describe, expect, it, vi } from 'vitest'

import { installBrowserFixture } from '@/test/browser-fixture'
import { BOOKING_ID } from '@/test/fixtures/auth'
import { installWebApp, removeWebApp } from '@/test/web-app-fixture'

import { openAddToCalendar } from './calendar'

const booking = {
  bookingId: BOOKING_ID,
  title: 'Стрижка & уход',
  date: '2026-07-21',
  time: '10:00',
  durationMin: 90,
  location: 'Москва, Тестовая улица, 1',
}

function mockUserAgent(value: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(value)
}

// .ics берётся с API-хоста: фронт живёт на GitHub Pages, бэкенд — на другом
// origin, поэтому путь строится от VITE_API_URL (пусто → относительный путь).
const ICS_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/bookings/${BOOKING_ID}/calendar.ics`

describe('calendar platform effect', () => {
  it('открывает ICS с API-хоста на iPhone', () => {
    mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
    const webApp = installWebApp()

    openAddToCalendar(booking)

    expect(webApp.openLink).toHaveBeenCalledWith(ICS_URL)
  })

  it('распознаёт iPadOS desktop mode', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    Object.defineProperty(document, 'ontouchend', { configurable: true, value: null })
    const webApp = installWebApp()

    openAddToCalendar(booking)

    expect(webApp.openLink).toHaveBeenCalledWith(ICS_URL)
    Reflect.deleteProperty(document, 'ontouchend')
  })

  it('строит encoded Google Calendar URL на Android/desktop', () => {
    mockUserAgent('Mozilla/5.0 (Linux; Android 15)')
    const webApp = installWebApp()

    openAddToCalendar(booking)

    const openedUrl = webApp.openLink.mock.calls[0]?.[0]
    expect(openedUrl).toBeDefined()
    const url = new URL(openedUrl!)
    expect(`${url.origin}${url.pathname}`).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe(booking.title)
    expect(url.searchParams.get('dates')).toBe('20260721T100000/20260721T113000')
    expect(url.searchParams.get('location')).toBe(booking.location)
  })

  it('не добавляет пустой location query', () => {
    mockUserAgent('Mozilla/5.0 (X11; Linux x86_64)')
    const webApp = installWebApp()

    openAddToCalendar({ ...booking, location: undefined })

    const url = new URL(webApp.openLink.mock.calls[0]?.[0] ?? '')
    expect(url.searchParams.has('location')).toBe(false)
  })

  it('использует browser window.open без WebApp', () => {
    mockUserAgent('Mozilla/5.0 (X11; Linux x86_64)')
    const browser = installBrowserFixture()
    removeWebApp()

    openAddToCalendar(booking)

    expect(browser.open).toHaveBeenCalledWith(
      expect.stringContaining('https://calendar.google.com/calendar/render'),
      '_blank',
      'noopener,noreferrer',
    )
  })
})
