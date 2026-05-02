import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { bookingsApi } from '@client/api/bookings.api'
import type { Booking } from '@client/types'
import { formatPrice } from '@client/types'
import BottomNav from '@client/components/BottomNav'
import { startParam } from '@/App'
import { useBookingStore } from '@client/store/booking.store'
import { text } from '@/styles/typography'

dayjs.locale('ru')

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function buildMonthGrid(year: number, month: number): (dayjs.Dayjs | null)[][] {
  const firstDay = dayjs(new Date(year, month, 1))
  const startOffset = (firstDay.day() || 7) - 1
  const daysInMonth = firstDay.daysInMonth()
  const cells: (dayjs.Dayjs | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => firstDay.add(i, 'day')),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (dayjs.Dayjs | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/* ── Icons (Figma 8535:44330 toolbarTop + calendarControl) ─────────────────── */

function IcoSearch() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="8" stroke="var(--color-on-surface)" strokeWidth="1.75"/>
      <path d="M21 21l-4-4" stroke="var(--color-on-surface)" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function IcoArrowDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="var(--color-on-surface-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IcoArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12.5 4L6.5 10l6 6" stroke="var(--color-on-surface-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IcoArrowRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M7.5 4L13.5 10l-6 6" stroke="var(--color-on-surface-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* Back-arrow 24×24 (vuesax/linear/arrow-left) — toolbar-leading в search-режиме. */
function IcoBack() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12l6.07 6.07" stroke="var(--color-on-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.5 12H3.67" stroke="var(--color-on-surface)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

/* X 20×20 — clear-кнопка в search-инпуте. */
function IcoClear() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M6 6l8 8M14 6l-8 8" stroke="var(--color-on-surface)" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

/* Подсветка совпадения подстроки в названии услуги — primary-blue. */
function HighlightedText({ value, query }: { value: string; query: string }) {
  if (!query) return <>{value}</>
  const lower = value.toLowerCase()
  const q = query.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx < 0) return <>{value}</>
  return (
    <>
      {value.substring(0, idx)}
      <span style={{ color: 'var(--color-primary-surface)' }}>
        {value.substring(idx, idx + query.length)}
      </span>
      {value.substring(idx + query.length)}
    </>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function MyBookingsPage() {
  const navigate = useNavigate()
  const storeMasterId = useBookingStore((s) => s.masterId)
  const setStoreMasterId = useBookingStore((s) => s.setMasterId)
  const currentMasterId = UUID_REGEX.test(startParam) ? startParam : storeMasterId

  const [bookings, setBookings] = useState<Booking[]>([])
  const today = dayjs().startOf('day')
  const [viewMonth, setViewMonth] = useState(today.startOf('month'))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Search mode (Figma 8535:48230). При активации скрывается календарь,
  // toolbar заменяется на «back-button + input», список фильтруется
  // по названию услуги или дате (число / название месяца).
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bookingsApi
      .list()
      .then((all) => {
        const filtered = currentMasterId
          ? all.filter((b) => b.master.id === currentMasterId)
          : all
        setBookings(filtered)
      })
      .catch(() => {})
  }, [currentMasterId])

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time)),
    [bookings],
  )

  const isPast = (b: Booking) =>
    dayjs(b.date + ' ' + b.time).isBefore(dayjs()) || b.status === 'COMPLETED' || b.status === 'CANCELLED'

  const upcomingCount = bookings.filter((b) => !isPast(b)).length

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, { hasFuture: boolean; hasPast: boolean }>()
    for (const b of bookings) {
      const rec = map.get(b.date) ?? { hasFuture: false, hasPast: false }
      if (isPast(b)) rec.hasPast = true
      else rec.hasFuture = true
      map.set(b.date, rec)
    }
    return map
  }, [bookings])

  // Filtered bookings — используется для search-режима. В обычном режиме
  // возвращаем все sortedBookings; в search-режиме при пустом запросе —
  // пустой массив (Figma не показывает список до ввода запроса).
  const filteredBookings = useMemo(() => {
    if (!searchMode) return sortedBookings
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return sortedBookings.filter((b) => {
      // 1) match по названию услуги
      if (b.service.name.toLowerCase().includes(q)) return true
      // 2) match по дате — число дня или название месяца ("март", "марта")
      const d = dayjs(b.date)
      const dayNum = d.format('D')               // "12", "22"
      const monthName = d.format('MMMM').toLowerCase() // "марта", "мая"
      const dayMonth = `${dayNum} ${monthName}`
      if (dayNum === q) return true
      if (monthName.includes(q)) return true
      if (dayMonth.includes(q)) return true
      return false
    })
  }, [searchMode, searchQuery, sortedBookings])

  // Группы по дате. В обычном режиме фильтруем по selectedDate (если выбрана);
  // в search-режиме показываем все совпавшие записи без selected-фильтра.
  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of filteredBookings) {
      const list = map.get(b.date) ?? []
      list.push(b)
      map.set(b.date, list)
    }
    if (!searchMode && selectedDate) {
      return map.has(selectedDate) ? [[selectedDate, map.get(selectedDate)!]] as const : []
    }
    return Array.from(map.entries())
  }, [filteredBookings, selectedDate, searchMode])

  const priceLabel = (b: Booking) => {
    const svc = b.service
    const base = svc.price
    const discounted = svc.discountPercent ? Math.round(base * (1 - svc.discountPercent / 100)) : base
    return formatPrice(discounted)
  }

  const endTime = (b: Booking) =>
    dayjs(`${b.date} ${b.time}`).add(b.service.duration, 'minute').format('HH:mm')

  const handleBookNew = () => {
    if (!currentMasterId) return
    setStoreMasterId(currentMasterId)
    navigate('/book/categories')
  }

  const handleEnterSearch = () => {
    setSearchMode(true)
    setSearchQuery('')
    // autofocus после следующего кадра, когда input уже отрендерился
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  const handleExitSearch = () => {
    setSearchMode(false)
    setSearchQuery('')
  }

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 95, display: 'flex', flexDirection: 'column' }}>

      {/* ── Toolbar (Figma 8535:43254 normal / 8535:46744 search) ─────────── */}
      {!searchMode ? (
        // Normal: title left + search button + Записаться pill (gap-10).
        <div style={{
          height: 56,
          padding: '6px 12px 6px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{
            fontSize: 22, lineHeight: '26px', fontWeight: 700, letterSpacing: -0.66,
            color: 'var(--color-on-surface)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {today.format('D MMMM, YYYY')}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              aria-label="Поиск"
              onClick={handleEnterSearch}
              style={{
                width: 44, height: 44, borderRadius: 22,
                background: 'var(--color-background)',
                border: 'none', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <IcoSearch />
            </button>

            <button
              onClick={handleBookNew}
              disabled={!currentMasterId}
              style={{
                height: 44, padding: '0 10px', borderRadius: 22,
                background: 'var(--color-primary-surface)',
                color: 'var(--color-on-primary-surface)',
                border: 'none',
                ...text.callout1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: currentMasterId ? 'pointer' : 'default',
                opacity: currentMasterId ? 1 : 0.5,
                flexShrink: 0,
              }}
            >
              Записаться
            </button>
          </div>
        </div>
      ) : (
        // Search-mode toolbar (Figma 8535:46744).
        // Layout: h=56, px-12 py-6 gap-8. leading=back-btn (44×44 round bg-bg)
        // + searchTop (flex-1 px-14 py-10 rounded-22 bg-bg) с input + X.
        <div style={{
          height: 56,
          padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <button
            aria-label="Назад"
            onClick={handleExitSearch}
            style={{
              width: 44, height: 44, borderRadius: 22,
              background: 'var(--color-background)',
              border: 'none', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <IcoBack />
          </button>

          <div style={{
            flex: 1, minWidth: 0, height: 44,
            padding: '0 14px', borderRadius: 22,
            background: 'var(--color-background)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по записям"
              style={{
                flex: 1, minWidth: 0,
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'inherit',
                fontSize: 18, lineHeight: '24px', fontWeight: 400,
                color: 'var(--color-interactive-element-accented)',
                padding: 0,
              }}
            />
            {searchQuery && (
              <button
                aria-label="Очистить"
                onClick={() => {
                  setSearchQuery('')
                  searchInputRef.current?.focus()
                }}
                style={{
                  width: 20, height: 20, padding: 0, borderRadius: '50%',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IcoClear />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Content area (Figma 8535:43248): px-16 py-8 gap-8 — общий
            горизонт. отступ для календаря и списка записей. ──────────────── */}
      <div style={{
        padding: '8px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
        flex: 1,
      }}>

      {!searchMode && (
      /* ── Calendar block (Figma 8535:43249). flex-col gap-8. ──────────── */
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* controls row — pl-6 + space-between */}
        <div style={{
          paddingLeft: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Month label pill — pl-8 pr-4 py-12, gap 8, rounded 100 */}
          <button
            onClick={() => setViewMonth(today.startOf('month'))}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 4px 12px 8px', borderRadius: 100,
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{
              ...text.body, color: 'var(--color-on-surface-secondary)', letterSpacing: -0.15,
              textTransform: 'capitalize',
            }}>
              {viewMonth.format('MMMM YYYY')}
            </span>
            <span style={{ display: 'inline-flex', padding: 4 }}>
              <IcoArrowDown />
            </span>
          </button>

          {/* Right: arrow-left + arrow-right, each p-12 (44×44) */}
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8, paddingRight: 4, borderRadius: 100 }}>
            <button
              onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}
              aria-label="Предыдущий месяц"
              style={{
                width: 44, height: 44, padding: 0, borderRadius: 22,
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IcoArrowLeft />
            </button>
            <button
              onClick={() => setViewMonth((m) => m.add(1, 'month'))}
              aria-label="Следующий месяц"
              style={{
                width: 44, height: 44, padding: 0, borderRadius: 22,
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IcoArrowRight />
            </button>
          </div>
        </div>

        {/* daysOfWeek row — h-48, body2Medium 17/24/500 ls 0.34 onsurfacesecondary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {DAY_NAMES.map((d) => (
            <div key={d} style={{
              height: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...text.body2Medium, color: 'var(--color-on-surface-secondary)',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* daysGrid — 7 cols, cell minH=56 px-4 py-8 rx-12, callout1 17/24 ls -0.17 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {buildMonthGrid(viewMonth.year(), viewMonth.month()).flat().map((day, i) => {
            if (!day) return <div key={i} style={{ minHeight: 56 }} />
            const val = day.format('YYYY-MM-DD')
            const isPastDay = day.isBefore(today, 'day')
            const isToday = day.isSame(today, 'day')
            const isSelected = val === selectedDate
            const isWeekend = (day.day() || 7) >= 6

            // Цвет цифры (Figma _calendarCell):
            //   weekend регуляр  → error-surface-accented
            //   weekend прошлый  → error-element-muted
            //   обычный регуляр  → interactive-element-accented
            //   обычный прошлый  → interactive-element-muted
            const textColor = isWeekend
              ? (isPastDay ? 'var(--color-error-element-muted)' : 'var(--color-error-surface-accented)')
              : (isPastDay ? 'var(--color-interactive-element-muted)' : 'var(--color-interactive-element-accented)')

            const rec = bookingsByDate.get(val)
            const showBadge = !!rec

            return (
              <button
                key={val}
                onClick={() => setSelectedDate(isSelected ? null : val)}
                style={{
                  position: 'relative',
                  minHeight: 56, padding: '8px 4px', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <span style={{ ...text.callout1, color: textColor }}>
                  {day.date()}
                </span>

                {/* Today mark — риска под цифрой. Figma: bottom-14, line w-10.5 h-2 stroke. */}
                {isToday && (
                  <span style={{
                    position: 'absolute',
                    bottom: 12,
                    left: '50%', transform: 'translateX(-50%)',
                    width: 10, height: 2, borderRadius: 1,
                    background: 'var(--color-error-surface-accented)',
                  }} />
                )}

                {/* Selected frame — 1.5px border, rounded-12 (накрывает всю клетку) */}
                {isSelected && (
                  <span style={{
                    position: 'absolute', inset: 0,
                    border: '1.5px solid var(--color-interactive-element-accented)',
                    borderRadius: 12, pointerEvents: 'none',
                  }} />
                )}

                {/* Badge dot top-right (10×10) — есть записи на дату.
                    По скриншоту дот красный (error-surface-accented); прошлые-only — серый. */}
                {showBadge && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 10, height: 10, borderRadius: '50%',
                    background: rec.hasFuture
                      ? 'var(--color-error-surface-accented)'
                      : 'var(--color-divider-mid)',
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
      )}

      {/* ── Appointment list (Figma 8535:43250 / 8535:46740). ─────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {groups.length === 0 ? (
          // empty state: 3 ветки.
          searchMode && !searchQuery.trim() ? null  // ждём ввода — пусто
          : searchMode ? (
            // Figma 8535:50007 «search-empty»: h=352 py-24 flex-col items-center
            // justify-center, текст pb-32 px-40 body2 onsurfacesecondary center.
            <div style={{
              minHeight: 352,
              padding: '24px 0',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              width: '100%',
            }}>
              <div style={{
                width: '100%', padding: '0 40px 32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  ...text.body2,
                  color: 'var(--color-on-surface-secondary)',
                  textAlign: 'center',
                }}>
                  Ничего не найдено
                </span>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center', color: 'var(--color-on-surface-secondary)',
              ...text.body, padding: '32px 16px',
            }}>
              {selectedDate ? 'Нет записей на этот день' : 'Нет записей'}
            </div>
          )
        ) : (
          groups.map(([date, items]) => {
            const d = dayjs(date)
            const dateLabel = `${d.format('D')} ${capitalize(d.format('MMMM'))}`
            const dayLabel = capitalize(d.format('dddd'))
            // Section считается прошедшей, если ВСЕ её записи в прошлом
            // (Figma 8535:48230: «12 марта • Вторник» с полностью muted-стилем).
            const sectionPast = items.every((b) => isPast(b))
            const sectionTextColor = sectionPast
              ? 'var(--color-on-surface-muted)'
              : 'var(--color-on-surface)'
            const sectionDayColor = 'var(--color-on-surface-muted)'
            return (
              <Fragment key={date}>
                {/* _appointmentSectionTitle — pt-16 pb-8 px-8, gap-8, items-center.
                    Future: callout1 onsurface white + green-vibrance bullet + body2 onsurfacemuted.
                    Past:   все элементы onsurfacemuted, bullet тоже muted. */}
                <div style={{
                  width: '100%',
                  padding: '16px 8px 8px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ ...text.callout1, color: sectionTextColor }}>
                    {dateLabel}
                  </span>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: sectionPast
                      ? 'var(--color-on-surface-muted)'
                      : 'linear-gradient(94deg, var(--color-grad-green-vibrance-0), var(--color-grad-green-vibrance-100))',
                  }} />
                  <span style={{ ...text.body2, color: sectionDayColor }}>
                    {dayLabel}
                  </span>
                </div>

                {/* Top divider — Figma h=8 контейнер с 1px-линией по центру */}
                <div style={{ width: '100%', height: 8, display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-divider-low)' }} />
                </div>

                {items.map((b) => {
                  const past = isPast(b)
                  // Past — Figma 8535:46740: полоса = pattern-element (#24262e),
                  // текст = onsurfacemuted, без line-through.
                  const lineBg = past
                    ? 'var(--color-pattern-element)'
                    : 'linear-gradient(94deg, var(--color-grad-green-vibrance-0), var(--color-grad-green-vibrance-100))'
                  const rowTextColor = past
                    ? 'var(--color-on-surface-muted)'
                    : 'var(--color-on-surface)'
                  const rowSecondaryColor = past
                    ? 'var(--color-on-surface-muted)'
                    : 'var(--color-on-surface-secondary)'

                  return (
                    <Fragment key={b.id}>
                      <button
                        onClick={() => navigate(`/my-bookings/${b.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', width: '100%',
                          background: 'none', border: 'none', padding: 0,
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        {/* lineWrapper h=60 p-8 — внутри 2×44 полоса (green / pattern). */}
                        <div style={{
                          height: 60, padding: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center',
                        }}>
                          <span style={{
                            width: 2, height: 44, borderRadius: 1,
                            background: lineBg,
                          }} />
                        </div>

                        {/* cell/theme — pl-8 py-8, flex 1.
                            В search-режиме совпадение «Уклад» подсвечивается primary-blue. */}
                        <div style={{
                          flex: 1, minWidth: 0,
                          padding: '8px 0 8px 8px',
                          display: 'flex', flexDirection: 'column',
                        }}>
                          <div style={{
                            ...text.callout1,
                            color: rowTextColor,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            <HighlightedText
                              value={b.service.name}
                              query={searchMode ? searchQuery.trim() : ''}
                            />
                          </div>
                          <div style={{
                            ...text.body, color: rowSecondaryColor, letterSpacing: -0.15,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {priceLabel(b)}
                          </div>
                        </div>

                        {/* timeCell — pl-16 pr-8 py-8, w=94 */}
                        <div style={{
                          width: 94, flexShrink: 0,
                          padding: '8px 8px 8px 16px',
                          display: 'flex', flexDirection: 'column',
                        }}>
                          <span style={{
                            fontSize: 17, lineHeight: '24px', fontWeight: 400, letterSpacing: -0.17,
                            color: rowTextColor,
                          }}>
                            {b.time}
                          </span>
                          <span style={{
                            ...text.body, color: rowSecondaryColor, letterSpacing: -0.15,
                          }}>
                            {endTime(b)}
                          </span>
                        </div>
                      </button>

                      {/* Divider после каждой записи — Figma h=8 + 1px-линия по центру */}
                      <div style={{ width: '100%', height: 8, display: 'flex', alignItems: 'center' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--color-divider-low)' }} />
                      </div>
                    </Fragment>
                  )
                })}
              </Fragment>
            )
          })
        )}
      </div>

      </div>

      <BottomNav badge={{ bookings: upcomingCount }} />
    </div>
  )
}
