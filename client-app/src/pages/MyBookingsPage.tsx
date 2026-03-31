import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { bookingsApi } from '@/api/bookings.api'
import type { Booking } from '@/types'
import BottomNav from '@/components/BottomNav'

dayjs.locale('ru')

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
  const [bookings, setBookings] = useState<Booking[]>([])
  const today = dayjs()
  const [viewMonth, setViewMonth] = useState(today.startOf('month'))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    bookingsApi.list().then(setBookings).catch(() => {})
  }, [])

  // Set of dates that have bookings
  const bookedDates = new Set(bookings.map((b) => b.date))

  // Active (upcoming) bookings count for badge
  const upcomingCount = bookings.filter(
    (b) => b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.date >= today.format('YYYY-MM-DD')
  ).length

  // Sort bookings chronologically
  const sortedBookings = [...bookings].sort((a, b) => {
    const da = a.date + ' ' + a.time
    const db = b.date + ' ' + b.time
    return da.localeCompare(db)
  })

  const displayedBookings = selectedDate
    ? sortedBookings.filter((b) => b.date === selectedDate)
    : sortedBookings

  const isPast = (b: Booking) => {
    const dt = b.date + ' ' + b.time
    return dayjs(dt).isBefore(today) || b.status === 'COMPLETED' || b.status === 'CANCELLED'
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#000', paddingBottom: 80 }}>
      {/* Шапка */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{today.format('D MMMM, YYYY')}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ background: '#1C1C1E', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#8E8E93" strokeWidth="2" />
              <path d="M16.5 16.5l4 4" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button style={{ background: '#2688EB', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Навигация месяца */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 8px' }}>
        <button
          onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}
          style={{ background: 'none', color: '#2688EB', fontSize: 20, padding: '4px 8px' }}
        >‹</button>
        <span style={{ fontWeight: 600, color: '#8E8E93', fontSize: 14 }}>
          {viewMonth.format('MMMM YYYY')} ▾
        </span>
        <button
          onClick={() => setViewMonth((m) => m.add(1, 'month'))}
          style={{ background: 'none', color: '#2688EB', fontSize: 20, padding: '4px 8px' }}
        >›</button>
      </div>

      {/* Сетка календаря */}
      <div style={{ padding: '0 16px 16px' }}>
        {/* Заголовок дней */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DAY_NAMES.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, color: '#8E8E93' }}>{d}</div>
          ))}
        </div>

        {buildMonthGrid(viewMonth.year(), viewMonth.month()).map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} />
              const val = day.format('YYYY-MM-DD')
              const isToday = day.isSame(today, 'day')
              const isSelected = val === selectedDate
              const hasBooking = bookedDates.has(val)
              const isWeekend = day.day() === 0 || day.day() === 6

              return (
                <button
                  key={val}
                  onClick={() => setSelectedDate(isSelected ? null : val)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '6px 0', borderRadius: 8, position: 'relative',
                    background: isSelected ? '#2688EB' : 'transparent',
                    color: isSelected ? '#fff' : isWeekend ? '#FF3B30' : '#fff',
                    border: isToday && !isSelected ? '1px solid #2688EB' : 'none',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: isToday ? 700 : 400, lineHeight: 1 }}>
                    {day.date()}
                  </span>
                  {hasBooking ? (
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: isSelected ? '#fff' : '#FF3B30',
                      marginTop: 2,
                    }} />
                  ) : (
                    <span style={{ width: 5, height: 5, marginTop: 2 }} />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Список записей */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 600, marginBottom: 12, letterSpacing: 0.5 }}>
          МОИ ЗАПИСИ {upcomingCount > 0 && (
            <span style={{
              background: '#2688EB', color: '#fff',
              borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 6,
            }}>
              {upcomingCount}
            </span>
          )}
        </div>

        {displayedBookings.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8E8E93', marginTop: 32 }}>
            {selectedDate ? 'Нет записей на этот день' : 'Нет записей'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {displayedBookings.map((b, idx) => {
              const past = isPast(b)
              const dateLabel = dayjs(b.date).format('D MMM')
              return (
                <button
                  key={b.id}
                  onClick={() => navigate(`/my-bookings/${b.id}`)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    padding: '12px 0',
                    borderBottom: idx < displayedBookings.length - 1 ? '1px solid #2C2C2E' : 'none',
                    textAlign: 'left', background: 'none',
                  }}
                >
                  <div style={{ color: '#8E8E93', fontSize: 13, minWidth: 50, flexShrink: 0 }}>
                    <div>{dateLabel}</div>
                    <div>{b.time}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 15,
                      textDecoration: past ? 'line-through' : 'none',
                      color: past ? '#8E8E93' : '#fff',
                    }}>
                      {b.service.name}
                    </div>
                    <div style={{ color: '#8E8E93', fontSize: 13, marginTop: 2 }}>{b.master.name}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav badge={{ bookings: upcomingCount }} />
    </div>
  )
}
