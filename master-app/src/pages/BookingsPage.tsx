import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { bookingsApi } from '@/api/bookings.api'
import { useAuthStore } from '@/store/auth.store'
import type { Booking } from '@/types'
import { text } from '@/styles/typography'

dayjs.locale('ru')

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatRub(kop: number): string {
  return (kop / 100).toLocaleString('ru-RU') + ' ₽'
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

interface GridCell {
  day: number
  date: string
  dow: number // 0=Пн .. 6=Вс
}

export default function BookingsPage() {
  const navigate = useNavigate()
  const master = useAuthStore((s) => s.master)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'))

  useEffect(() => {
    bookingsApi.list().then(setBookings).catch(() => {})
  }, [])

  // Рабочие минуты в день по расписанию мастера (минус обед)
  const workMinutes = useMemo(() => {
    if (!master?.schedule) return 8 * 60
    const s = master.schedule
    const startM = timeToMinutes(s.startTime)
    const endM = timeToMinutes(s.endTime)
    const breakM =
      s.breakStart && s.breakEnd
        ? timeToMinutes(s.breakEnd) - timeToMinutes(s.breakStart)
        : 0
    return Math.max(1, endM - startM - breakM)
  }, [master?.schedule])

  // % загрузки по дате (0..100)
  const loadByDate = useMemo(() => {
    const totals = new Map<string, number>()
    for (const b of bookings) {
      if (b.status === 'CANCELLED') continue
      totals.set(b.date, (totals.get(b.date) ?? 0) + b.service.duration)
    }
    const result = new Map<string, number>()
    for (const [date, mins] of totals) {
      result.set(date, Math.min(100, (mins / workMinutes) * 100))
    }
    return result
  }, [bookings, workMinutes])

  // Записи выбранного дня (без CANCELLED), по возрастанию времени
  const dayBookings = useMemo(() => {
    return bookings
      .filter((b) => b.date === selectedDate && b.status !== 'CANCELLED')
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [bookings, selectedDate])

  // Сетка дней месяца с пустыми ячейками в начале и конце
  const gridDays = useMemo<Array<GridCell | null>>(() => {
    const startOfMonth = currentMonth.startOf('month')
    const daysInMonth = currentMonth.daysInMonth()
    // dayjs .day(): 0=Вс, 1=Пн .. 6=Сб. Переводим в ISO 0=Пн..6=Вс.
    const startDow = (startOfMonth.day() + 6) % 7
    const totalCells = Math.ceil((daysInMonth + startDow) / 7) * 7
    const days: Array<GridCell | null> = []
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startDow + 1
      if (dayNum < 1 || dayNum > daysInMonth) {
        days.push(null)
      } else {
        const date = currentMonth.date(dayNum).format('YYYY-MM-DD')
        const dow = i % 7
        days.push({ day: dayNum, date, dow })
      }
    }
    return days
  }, [currentMonth])

  const today = dayjs().format('YYYY-MM-DD')
  const now = dayjs()

  // Свайп месяца
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const dx = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(dx) > 50) {
      setCurrentMonth((m) => (dx > 0 ? m.subtract(1, 'month') : m.add(1, 'month')))
    }
    setTouchStartX(null)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-background)', color: 'var(--color-on-surface)', paddingBottom: 95 }}>
      {/* Header: только "+" кнопка справа */}
      <header
        style={{
          height: 56,
          position: 'sticky',
          top: 0,
          background: 'var(--color-background)',
          zIndex: 10,
        }}
      >
        <button
          aria-label="Создать запись"
          onClick={() => navigate('/bookings/new')}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'var(--color-primary-surface)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13" stroke="var(--color-on-primary-surface)" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 3V13" stroke="var(--color-on-primary-surface)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Селектор месяца */}
      <div
        style={{
          marginTop: 35,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            ...text.body,
            fontWeight: 500,
            color: 'var(--color-on-surface)',
          }}
        >
          <span>{capitalize(currentMonth.format('MMMM YYYY'))}</span>
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
            <path
              d="M0 0L4 4L8 0"
              stroke="var(--color-on-surface)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ display: 'flex' }}>
          <button
            aria-label="Предыдущий месяц"
            onClick={() => setCurrentMonth((m) => m.subtract(1, 'month'))}
            style={{
              width: 40,
              height: 40,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
              <path
                d="M7 1L1 6L7 11"
                stroke="var(--color-on-surface)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            aria-label="Следующий месяц"
            onClick={() => setCurrentMonth((m) => m.add(1, 'month'))}
            style={{
              width: 40,
              height: 40,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
              <path
                d="M1 1L7 6L1 11"
                stroke="var(--color-on-surface)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Заголовок дней недели */}
      <div
        style={{
          marginTop: 34,
          padding: '0 14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
        }}
      >
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              ...text.action,
              fontWeight: 500,
              color: 'var(--color-divider-mid)',
              lineHeight: 1,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Сетка дней */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          marginTop: 20,
          padding: '0 14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
        }}
      >
        {gridDays.map((cell, idx) => {
          if (!cell) return <div key={`e${idx}`} style={{ height: 54 }} />
          const isToday = cell.date === today
          const isSelected = cell.date === selectedDate
          const isPast = cell.date < today
          const isWeekend = cell.dow >= 5
          const load = loadByDate.get(cell.date) ?? 0

          return (
            <div
              key={cell.date}
              onClick={() => setSelectedDate(cell.date)}
              style={{
                height: 54,
                position: 'relative',
                borderRadius: 12,
                background: isToday ? 'var(--color-primary-surface)' : 'transparent',
                border: !isToday && isSelected ? '2px solid var(--color-primary-surface)' : '2px solid transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                opacity: isPast && !isToday ? 0.5 : 1,
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  ...text.subheadRegular,
                  fontWeight: 400,
                  lineHeight: 1,
                  marginTop: 18,
                  color: isToday ? 'var(--color-on-primary-surface)' : isWeekend ? 'var(--color-error-surface-accented)' : 'var(--color-on-surface)',
                }}
              >
                {cell.day}
              </span>
              {load > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 9,
                    width: 40,
                    marginLeft: -20,
                  }}
                >
                  <div
                    style={{
                      width: `${load}%`,
                      height: 3,
                      borderRadius: 1.5,
                      background: isToday ? 'var(--color-on-primary-surface)' : 'var(--color-success-surface-accented)',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Записи выбранного дня */}
      <div style={{ marginTop: 20, padding: '0 14px' }}>
        {dayBookings.map((b) => {
          const endTime = dayjs(`${b.date}T${b.time}`).add(b.service.duration, 'minute')
          const isCompleted = b.status === 'COMPLETED' || endTime.isBefore(now)
          const textColor = isCompleted ? 'var(--color-on-surface-secondary)' : 'var(--color-on-surface)'
          const line = isCompleted ? ('line-through' as const) : ('none' as const)

          return (
            <div
              key={b.id}
              onClick={() => navigate(`/bookings/${b.id}`)}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                minHeight: 57,
                borderTop: '1px solid var(--color-surface)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 71,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <span style={{ ...text.action, lineHeight: 1, color: textColor }}>{b.time}</span>
              </div>
              <div style={{ width: 1, background: 'var(--color-surface)' }} />
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  paddingLeft: 16,
                }}
              >
                <div
                  style={{
                    ...text.action,
                    fontWeight: 600,
                    lineHeight: 1,
                    color: textColor,
                    textDecoration: line,
                  }}
                >
                  {b.service.name}
                </div>
                <div
                  style={{
                    ...text.caption,
                    lineHeight: 1,
                    color: 'var(--color-on-surface-secondary)',
                    marginTop: 6,
                    textDecoration: line,
                  }}
                >
                  {formatRub(b.service.price)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}