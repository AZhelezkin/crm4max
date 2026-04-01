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

  const bookedDates = new Set(bookings.map((b) => b.date))

  const upcomingCount = bookings.filter(
    (b) => b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.date >= today.format('YYYY-MM-DD')
  ).length

  const sortedBookings = [...bookings].sort((a, b) =>
    (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time)
  )

  const displayedBookings = selectedDate
    ? sortedBookings.filter((b) => b.date === selectedDate)
    : sortedBookings

  const isPast = (b: Booking) =>
    dayjs(b.date + ' ' + b.time).isBefore(today) || b.status === 'COMPLETED' || b.status === 'CANCELLED'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: 95 }}>

      {/* Шапка TopBar */}
      <div style={{
        padding: '48px 16px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>
          {today.format('D MMMM, YYYY')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            background: 'var(--color-card)', borderRadius: 'var(--radius-sm)',
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#7D7D7F" strokeWidth="2"/>
              <path d="M16.5 16.5l4 4" stroke="#7D7D7F" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Навигация месяца */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px 8px',
      }}>
        <button
          onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}
          style={{ background: 'none', padding: '4px 8px' }}
        >
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
            <path d="M8 1L1 8l7 7" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{
          fontWeight: 600, color: 'var(--color-text-secondary)',
          fontSize: 15, textTransform: 'capitalize',
        }}>
          {viewMonth.format('MMMM YYYY')}
        </span>
        <button
          onClick={() => setViewMonth((m) => m.add(1, 'month'))}
          style={{ background: 'none', padding: '4px 8px' }}
        >
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
            <path d="M1 1l7 7-7 7" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Сетка календаря */}
      <div style={{ padding: '0 16px 16px' }}>
        {/* Дни недели */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          marginBottom: 4,
        }}>
          {DAY_NAMES.map((d) => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 13,
              color: 'var(--color-text-secondary)',
              padding: '4px 0',
            }}>
              {d}
            </div>
          ))}
        </div>

        {buildMonthGrid(viewMonth.year(), viewMonth.month()).map((week, wi) => (
          <div key={wi} style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2, marginBottom: 2,
          }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} />
              const val = day.format('YYYY-MM-DD')
              const isToday = day.isSame(today, 'day')
              const isSelected = val === selectedDate
              const hasBooking = bookedDates.has(val)

              let bg = 'transparent'
              if (isSelected) bg = '#007AFE'
              else if (isToday) bg = 'rgba(0,122,254,0.15)'

              return (
                <button
                  key={val}
                  onClick={() => setSelectedDate(isSelected ? null : val)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    width: 55, height: 54, borderRadius: '50%',
                    margin: '0 auto',
                    background: bg,
                    border: isToday && !isSelected ? '1px solid #007AFE' : 'none',
                  }}
                >
                  <span style={{
                    fontSize: 15,
                    fontWeight: isToday ? 700 : 400,
                    color: isSelected ? '#fff' : 'var(--color-text)',
                    lineHeight: 1,
                  }}>
                    {day.date()}
                  </span>
                  {hasBooking ? (
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: isSelected ? '#fff' : 'var(--color-danger)',
                      marginTop: 2, display: 'block',
                    }} />
                  ) : (
                    <span style={{ width: 5, height: 5, marginTop: 2, display: 'block' }} />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Список записей */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          fontSize: 14, color: 'var(--color-text-secondary)',
          fontWeight: 400, marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          МОИ ЗАПИСИ
          {upcomingCount > 0 && (
            <span style={{
              background: 'rgba(0,122,254,0.30)',
              color: '#007AFE',
              borderRadius: 20, padding: '2px 8px',
              fontSize: 15, fontWeight: 400,
              minWidth: 23, textAlign: 'center',
            }}>
              {upcomingCount}
            </span>
          )}
        </div>

        {displayedBookings.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 32 }}>
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
                    borderBottom: idx < displayedBookings.length - 1
                      ? '1px solid var(--color-border)' : 'none',
                    textAlign: 'left', background: 'none', width: '100%',
                  }}
                >
                  {/* Дата и время слева */}
                  <div style={{
                    minWidth: 50, flexShrink: 0,
                    color: past ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 400 }}>{dateLabel}</div>
                    <div style={{ fontSize: 15, fontWeight: 400 }}>{b.time}</div>
                  </div>

                  {/* Услуга и мастер */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 19, fontWeight: 500,
                      color: past ? 'var(--color-text-secondary)' : 'var(--color-text)',
                      textDecoration: past ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {b.service.name}
                    </div>
                    <div style={{
                      fontSize: 15, fontWeight: 400,
                      color: 'var(--color-text-secondary)', marginTop: 2,
                    }}>
                      {b.master.name}
                    </div>
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
