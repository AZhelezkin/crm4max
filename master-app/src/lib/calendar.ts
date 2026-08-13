import dayjs from 'dayjs'
import { openMiniAppLink } from './miniAppHost'

/** iOS-устройство (включая iPadOS, который в desktop-режиме мимикрирует под Mac). */
function isIOS(): boolean {
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return /Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document
}

/**
 * Добавление записи в календарь устройства. Развилка по платформе:
 * - iOS → серверный .ics: Safari предлагает нативное «Добавить в Календарь» (Apple).
 * - Android/десктоп → ссылка-шаблон Google Calendar: один переход прямо в календарь.
 *   (На Android открытие text/calendar просто скачивает .ics в «Загрузки» — лишние
 *   шаги, поэтому там оставляем прежнее поведение через Google.)
 */
export function openAddToCalendar(p: {
  bookingId: string
  title: string
  date: string        // "YYYY-MM-DD"
  time: string        // "HH:mm"
  durationMin: number
  location?: string
}): void {
  let url: string
  if (isIOS()) {
    url = `${import.meta.env.VITE_API_URL ?? ''}/api/bookings/${p.bookingId}/calendar.ics`
  } else {
    const start = dayjs(`${p.date}T${p.time}`)
    const end = start.add(p.durationMin, 'minute')
    const fmt = (d: dayjs.Dayjs) => d.format('YYYYMMDDTHHmmss')
    url =
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(p.title)}` +
      `&dates=${fmt(start)}/${fmt(end)}${p.location ? `&location=${encodeURIComponent(p.location)}` : ''}`
  }
  openMiniAppLink(url)
}
