import { useEffect, useMemo, useState } from 'react'
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

export default function MyBookingsPage() {
  const navigate = useNavigate()
  const storeMasterId = useBookingStore((s) => s.masterId)
  const setStoreMasterId = useBookingStore((s) => s.setMasterId)
  const currentMasterId = UUID_REGEX.test(startParam) ? startParam : storeMasterId

  const [bookings, setBookings] = useState<Booking[]>([])
  const today = dayjs()
  const [viewMonth, setViewMonth] = useState(today.startOf('month'))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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
    dayjs(b.date + ' ' + b.time).isBefore(today) || b.status === 'COMPLETED' || b.status === 'CANCELLED'

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

  const displayedBookings = selectedDate
    ? sortedBookings.filter((b) => b.date === selectedDate)
    : sortedBookings

  const priceLabel = (b: Booking) => {
    const svc = b.service
    const base = svc.price
    const discounted = svc.discountPercent ? Math.round(base * (1 - svc.discountPercent / 100)) : base
    return formatPrice(discounted)
  }

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 95 }}>

      {/* Date title + action buttons */}
      <div style={{
        padding: '20px 16px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          ...text.titleSmall, color: 'var(--color-on-primary-surface)',
          letterSpacing: -0.3,
        }}>
          {today.format('D MMMM, YYYY')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="var(--color-on-surface-secondary)" strokeWidth="2"/>
              <path d="M16.5 16.5l4 4" stroke="var(--color-on-surface-secondary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            onClick={() => {
              if (!currentMasterId) return
              setStoreMasterId(currentMasterId)
              navigate('/book/categories')
            }}
            disabled={!currentMasterId}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--color-primary-surface)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="var(--color-on-primary-surface)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Month switcher */}
      <div style={{
        padding: '18px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => setViewMonth(today.startOf('month'))}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--color-on-surface-secondary)', ...text.bodyMedium, textTransform: 'capitalize',
          }}
        >
          {viewMonth.format('MMMM YYYY')}
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="var(--color-on-surface-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}
          >
            <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
              <path d="M8 1L1 8l7 7" stroke="var(--color-on-surface-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => setViewMonth((m) => m.add(1, 'month'))}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}
          >
            <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
              <path d="M1 1l7 7-7 7" stroke="var(--color-on-surface-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Day names */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
          {DAY_NAMES.map((d) => (
            <div key={d} style={{
              textAlign: 'center', ...text.footnote, color: 'var(--color-on-surface-secondary)',
              padding: '6px 0', fontWeight: 400,
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {buildMonthGrid(viewMonth.year(), viewMonth.month()).map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} style={{ height: 54 }} />
              const val = day.format('YYYY-MM-DD')
              const isToday = day.isSame(today, 'day')
              const isSelected = val === selectedDate
              const weekday = day.day() // 0=Sun,6=Sat
              const isWeekend = weekday === 0 || weekday === 6
              const rec = bookingsByDate.get(val)
              const dotColor = rec
                ? rec.hasFuture
                  ? 'var(--color-error-surface-accented)'
                  : 'var(--color-divider-low)'
                : null

              return (
                <button
                  key={val}
                  onClick={() => setSelectedDate(isSelected ? null : val)}
                  style={{
                    position: 'relative',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: 54,
                    background: isSelected ? 'rgba(0,122,254,0.15)' : 'transparent',
                    border: 'none', borderRadius: 12, cursor: 'pointer',
                  }}
                >
                  <span style={{
                    position: 'relative',
                    ...text.callout, lineHeight: 1,
                    color: isWeekend ? 'var(--color-error-surface-accented)' : 'var(--color-on-primary-surface)',
                  }}>
                    {day.date()}
                    {dotColor && (
                      <span style={{
                        position: 'absolute',
                        top: -6, right: -9,
                        width: 9, height: 9, borderRadius: '50%',
                        background: dotColor,
                      }} />
                    )}
                  </span>
                  {isToday && (
                    <span style={{
                      position: 'absolute', bottom: 10,
                      width: 16, height: 2, borderRadius: 1,
                      background: 'var(--color-error-surface-accented)',
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Bookings list header */}
      <div style={{ padding: '24px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          ...text.footnote, color: 'var(--color-on-surface-secondary)', fontWeight: 400, letterSpacing: 0.2,
        }}>
          МОИ ЗАПИСИ
        </div>
        {displayedBookings.length > 0 && (
          <span style={{
            background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)',
            borderRadius: 12, padding: '1px 9px',
            ...text.footnoteStrong, minWidth: 22, textAlign: 'center',
          }}>
            {displayedBookings.length}
          </span>
        )}
      </div>

      {/* Bookings list */}
      {displayedBookings.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', marginTop: 24, ...text.action }}>
          {selectedDate ? 'Нет записей на этот день' : 'Нет записей'}
        </div>
      ) : (
        <div>
          {displayedBookings.map((b, idx) => {
            const past = isPast(b)
            const dateLabel = dayjs(b.date).format('DD MMM').replace('.', '')
            return (
              <button
                key={b.id}
                onClick={() => navigate(`/my-bookings/${b.id}`)}
                style={{
                  display: 'flex', alignItems: 'stretch', width: '100%',
                  padding: '14px 16px',
                  background: 'none',
                  borderLeft: 'none', borderRight: 'none',
                  borderTop: idx === 0 ? '1px solid var(--color-surface)' : 'none',
                  borderBottom: '1px solid var(--color-surface)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  minWidth: 54, flexShrink: 0, color: 'var(--color-on-surface-secondary)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  <div style={{ ...text.footnote, lineHeight: 1.3 }}>{dateLabel}</div>
                  <div style={{ ...text.footnote, lineHeight: 1.3 }}>{b.time}</div>
                </div>
                <div style={{ width: 1, background: 'var(--color-divider-low)', margin: '2px 14px 2px 2px' }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{
                    ...text.subheadline, lineHeight: 1.3,
                    color: past ? 'var(--color-on-surface-secondary)' : 'var(--color-on-primary-surface)',
                    textDecoration: past ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {b.service.name}
                  </div>
                  <div style={{
                    ...text.action, color: 'var(--color-on-surface-secondary)', marginTop: 4,
                  }}>
                    {priceLabel(b)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <BottomNav badge={{ bookings: upcomingCount }} />
    </div>
  )
}
