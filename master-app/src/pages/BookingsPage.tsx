import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useBookingsStore } from '@/store/bookings.store'
import { useScheduleStore } from '@/store/schedule.store'
import { bookingDuration, bookingTotal, bookingServiceNames, type Booking } from '@/types'
import { text } from '@/styles/typography'

dayjs.locale('ru')

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

const INDICATOR_SIDE_PADDING = 3
const NON_WORKING_DAY_MINUTES = 8 * 60
const SELECTED_DATE_KEY = 'bookings.selectedDate'

function readSelectedDate(): string {
  try { return sessionStorage.getItem(SELECTED_DATE_KEY) ?? dayjs().format('YYYY-MM-DD') } catch { return dayjs().format('YYYY-MM-DD') }
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function formatRub(kop: number): string {
  return (kop / 100).toLocaleString('ru-RU') + ' ₽'
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Ячейки месяца: пустые null в начале (до 1-го числа по ISO-неделе) и в конце добора недели.
function buildMonthGrid(monthStart: dayjs.Dayjs): (dayjs.Dayjs | null)[] {
  const daysInMonth = monthStart.daysInMonth()
  const startOffset = (monthStart.day() || 7) - 1 // ISO: Пн=0 … Вс=6
  const cells: (dayjs.Dayjs | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => monthStart.add(i, 'day')),
  ]
  while (cells.length < 42) cells.push(null)
  return cells
}

export default function BookingsPage() {
  const navigate = useNavigate()
  const bookings = useBookingsStore((state) => state.bookings)
  const fetchBookings = useBookingsStore((state) => state.fetchBookings)
  const schedule = useScheduleStore((state) => state.schedule)
  const fetchSchedule = useScheduleStore((state) => state.fetchSchedule)
  const [selectedDate, setSelectedDate] = useState(readSelectedDate)
  const [currentMonth, setCurrentMonth] = useState(() => dayjs(readSelectedDate()).startOf('month'))

  // Month-picker меню (как в кабинете клиента, MyBookingsPage): тап по пилюле
  // «Месяц Год» → список месяцев текущего года. Закрытие по клику вне.
  const [monthMenuOpen, setMonthMenuOpen] = useState(false)
  const monthMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!monthMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!monthMenuRef.current?.contains(e.target as Node)) setMonthMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [monthMenuOpen])

  useEffect(() => {
    void fetchBookings()
    void fetchSchedule()
  }, [fetchBookings, fetchSchedule])
  useEffect(() => {
    try { sessionStorage.setItem(SELECTED_DATE_KEY, selectedDate) } catch { /* storage недоступен */ }
  }, [selectedDate])

  const today = dayjs().format('YYYY-MM-DD')

  // Сумма длительностей не отменённых записей по дате (минуты) — занятость дня.
  const bookedMinutesByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of bookings) {
      if (b.status === 'CANCELLED') continue
      map.set(b.date, (map.get(b.date) ?? 0) + bookingDuration(b))
    }
    return map
  }, [bookings])

  // Длина рабочего дня (минуты) по дню недели (ISO 1..7), за вычетом обеда.
  // 0 — день не рабочий. Используется как 100% для длины индикатора.
  const workingMinutesByDow = useMemo(() => {
    const map: Record<number, number> = {}
    if (!schedule) return map
    let win = toMin(schedule.endTime) - toMin(schedule.startTime)
    if (schedule.breakStart && schedule.breakEnd) win -= toMin(schedule.breakEnd) - toMin(schedule.breakStart)
    win = Math.max(0, win)
    for (const dow of schedule.workingDays) map[dow] = win
    return map
  }, [schedule])

  // Записи выбранного дня (без CANCELLED), по возрастанию времени.
  const dayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date === selectedDate && b.status !== 'CANCELLED')
        .sort((a, b) => a.time.localeCompare(b.time)),
    [bookings, selectedDate],
  )

  const cells = useMemo(() => buildMonthGrid(currentMonth), [currentMonth])

  // Свайп месяца влево/вправо.
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX)
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const dx = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(dx) > 50) setCurrentMonth((m) => (dx > 0 ? m.subtract(1, 'month') : m.add(1, 'month')))
    setTouchStartX(null)
  }

  const selectedDayjs = dayjs(selectedDate)

  return (
    <div style={{ minHeight: '100dvh', color: 'var(--color-on-surface)', paddingBottom: 95 }}>
      {/* Тулбар: дата выбранного дня слева (H3), синяя «+»-пилюля справа (макет 8718-37858). */}
      <div style={{ height: 76, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <h1
          style={{
            ...text.h3,
            color: 'var(--color-on-surface)',
            margin: 0,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedDayjs.format('D MMMM, YYYY')}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-primary-surface)', borderRadius: 22, flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Создать запись"
            onClick={() => navigate('/bookings/new', { state: { date: selectedDate } })}
            style={{
              background: 'none',
              border: 'none',
              padding: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-on-primary-surface)',
            }}
          >
            <AddIcon />
          </button>
        </div>
      </div>

      {/* Календарь (макет 8718-37990): controls / daysOfWeek / daysGrid, gap 8. */}
      <div style={{ paddingInline: 16, display: 'flex', flexDirection: 'column', gap: 8 }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* controls: месяц + стрелки */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 6 }}>
          <div ref={monthMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setMonthMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={monthMenuOpen}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 4px 12px 8px', borderRadius: 100,
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <span style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)' }}>{capitalize(currentMonth.format('MMMM YYYY'))}</span>
              <span style={{
                display: 'inline-flex',
                transform: monthMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}>
                <ArrowDownIcon />
              </span>
            </button>

            {/* Month menu (как в клиентском MyBookingsPage, Figma 8671:38152). */}
            {monthMenuOpen && (
              <div role="menu" style={{
                position: 'absolute',
                top: 'calc(100% + 4px)', left: 0,
                width: 210,
                background: 'var(--color-surface)',
                borderRadius: 16,
                padding: '12px 20px',
                boxShadow: '0 4px 4px -1px rgba(12,12,13,0.05), 0 16px 32px -1px rgba(12,12,13,0.1)',
                display: 'flex', flexDirection: 'column',
                zIndex: 20,
              }}>
                {MONTH_NAMES.map((name, idx) => {
                  const isCurrent = idx === currentMonth.month()
                  return (
                    <Fragment key={name}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setCurrentMonth((m) => m.month(idx)); setMonthMenuOpen(false) }}
                        style={{
                          width: '100%', padding: '6px 0',
                          background: 'none', border: 'none', cursor: 'pointer',
                          textAlign: 'left',
                          ...text.body2,
                          color: isCurrent ? 'var(--color-active-element)' : 'var(--color-on-surface)',
                        }}
                      >
                        {name}
                      </button>
                      {idx < MONTH_NAMES.length - 1 && (
                        <div style={{ width: '100%', height: 1, background: 'var(--color-divider-low)' }} />
                      )}
                    </Fragment>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button type="button" aria-label="Предыдущий месяц" onClick={() => setCurrentMonth((m) => m.subtract(1, 'month'))} style={iconBtnStyle}>
              <ChevronIcon dir="left" />
            </button>
            <button type="button" aria-label="Следующий месяц" onClick={() => setCurrentMonth((m) => m.add(1, 'month'))} style={iconBtnStyle}>
              <ChevronIcon dir="right" />
            </button>
          </div>
        </div>

        <div>
          {/* daysOfWeek */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.body2Medium, color: 'var(--color-on-surface-secondary)' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* daysGrid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} style={{ minHeight: 56 }} />
            const val = day.format('YYYY-MM-DD')
            const isPast = val < today
            const isSelected = val === selectedDate
            const isWeekend = (day.day() || 7) >= 6
            const bookedMin = bookedMinutesByDate.get(val) ?? 0
            const hasAppts = bookedMin > 0
            // Длина индикатора пропорциональна занятости рабочего дня.
            // Нет данных о графике для этого дня (workMin=0) → полная риска, как раньше.
            const workMin = workingMinutesByDow[day.day() || 7] ?? 0
            // Нерабочий день мастера (день недели не входит в график) → серая подложка
            // (макет 8718-55269). Считаем только при загруженном графике, иначе все дни
            // были бы серыми до прихода schedule.
            const isNonWorking = !!schedule && !schedule.workingDays.includes(day.day() || 7)
            // Для записи в выходной процента рабочего графика нет, поэтому
            // показываем загрузку относительно условного восьмичасового дня.
            const capacityMin = workMin > 0 ? workMin : NON_WORKING_DAY_MINUTES
            const ratio = Math.min(1, bookedMin / capacityMin)
            const indicatorWPercent = Math.max(0, Math.round(ratio * 100))
            // Текст: будни/выходные × прошлое/настоящее (как в кабинете клиента).
            const color = isWeekend
              ? isPast
                ? 'var(--color-error-element-muted)'
                : 'var(--color-error-surface-accented)'
              : isPast
                ? 'var(--color-interactive-element-muted)'
                : 'var(--color-interactive-element-accented)'
            return (
              <button
                key={val}
                type="button"
                onClick={() => setSelectedDate(val)}
                style={{
                  minHeight: 56,
                  padding: '8px 4px',
                  borderRadius: 16,
                  cornerShape: 'squircle',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  ...text.callout1,
                  color,
                  background: isNonWorking ? 'var(--color-calendar-non-working-surface-transparent)' : hasAppts ? 'var(--color-calendar-booked-surface-transparent)' : 'transparent',
                  backdropFilter: isNonWorking || hasAppts ? 'blur(12px)' : undefined,
                  WebkitBackdropFilter: isNonWorking || hasAppts ? 'blur(12px)' : undefined,
                  border: isSelected ? '1.5px solid var(--color-interactive-element-accented)' : '1.5px solid transparent',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {day.date()}
                {hasAppts && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: INDICATOR_SIDE_PADDING,
                      right: INDICATOR_SIDE_PADDING,
                      height: 4,
                      borderRadius: 100,
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      data-testid={`booking-load-${val}`}
                      style={{
                        display: 'block',
                        width: `${indicatorWPercent}%`,
                        minWidth: 4,
                        margin: '0 auto',
                        maxWidth: '100%',
                        height: '100%',
                        borderRadius: 100,
                        background: 'var(--color-on-success-surface-lite)',
                      }}
                    />
                  </span>
                )}
              </button>
            )
            })}
          </div>
        </div>
      </div>

      {/* Список записей дня (макет 8718-47821): дивайдеры divider-low h8, секция-заголовок, строки. */}
      <div style={{ marginTop: 8, padding: '0 16px', display: 'flex', flexDirection: 'column' }}>
        <AnimatedSchedule contentKey={dayBookings.length > 0 ? dayBookings.map((booking) => booking.id).join(':') : 'empty'}>
          {dayBookings.length > 0 ? (
            <>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 }}>
              <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{selectedDayjs.format('D MMMM')}</span>
              <span style={{ ...text.body2, color: 'var(--color-on-success-surface-lite)' }}>•</span>
              <span style={{ ...text.body2, color: 'var(--color-on-surface-muted)' }}>{capitalize(selectedDayjs.format('dddd'))}</span>
            </div>
            {dayBookings.map((b) => (
              <Fragment key={b.id}>
                <Divider />
                <AppointmentRow booking={b} onClick={() => navigate(`/bookings/${b.id}`)} />
              </Fragment>
            ))}
            <Divider />
            </>
          ) : (
            <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>Нет записей на этот день</div>
          )}
        </AnimatedSchedule>
      </div>
    </div>
  )
}

function AnimatedSchedule({ contentKey, children }: { contentKey: string; children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const renderedKey = useRef(contentKey)
  const pendingChildren = useRef(children)
  const pendingKey = useRef(contentKey)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const [renderedChildren, setRenderedChildren] = useState(children)
  const [phase, setPhase] = useState<'idle' | 'fadeOut' | 'resize' | 'fadeIn'>('idle')

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    if (!initialized.current) {
      initialized.current = true
      return
    }
    if (phase !== 'resize') return

    const nextHeight = content.getBoundingClientRect().height
    const currentHeight = containerRef.current?.getBoundingClientRect().height ?? nextHeight
    if (Math.abs(nextHeight - currentHeight) < 1) {
      setHeight('auto')
      setPhase('fadeIn')
      return
    }
    requestAnimationFrame(() => setHeight(nextHeight))
  }, [renderedChildren, phase])

  useLayoutEffect(() => {
    pendingChildren.current = children
    pendingKey.current = contentKey
    if (!initialized.current) return
    if (contentKey === renderedKey.current) return
    if (phase === 'idle' || phase === 'fadeIn') setPhase('fadeOut')
  }, [contentKey])

  const visible = phase === 'idle' || phase === 'fadeIn'

  return (
    <div
      ref={containerRef}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget || event.propertyName !== 'height' || phase !== 'resize') return
        setHeight('auto')
        setPhase('fadeIn')
      }}
      style={{ height, overflow: 'hidden', transition: phase === 'resize' ? 'height 240ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none' }}
    >
      <div
        ref={contentRef}
        onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return
          if (phase === 'fadeOut') {
            renderedKey.current = pendingKey.current
            setHeight(containerRef.current?.getBoundingClientRect().height ?? 'auto')
            setRenderedChildren(pendingChildren.current)
            setPhase('resize')
          } else if (phase === 'fadeIn') {
            setPhase('idle')
          }
        }}
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 160ms ease, transform 160ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {renderedChildren}
      </div>
    </div>
  )
}

// Строка записи: зелёная риска статуса (2×44), услуга + цена слева, время (начало/конец) справа.
function AppointmentRow({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  const endDateTime = dayjs(`${booking.date}T${booking.time}`).add(bookingDuration(booking), 'minute')
  const endTime = endDateTime.format('HH:mm')
  const isPast = endDateTime.isBefore(dayjs())
  const primaryColor = isPast ? 'var(--color-on-surface-muted)' : 'var(--color-on-surface)'
  const secondaryColor = isPast ? 'var(--color-on-surface-muted)' : 'var(--color-on-surface-secondary)'
  const statusColor = isPast ? 'var(--color-pattern-element)' : 'var(--color-on-success-surface-lite)'
  // Цвет записи, выбранный мастером, важнее статусного (кроме прошедших — они приглушены).
  const lineColor = booking.color && !isPast ? booking.color : statusColor
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: 8, flexShrink: 0 }}>
          <div style={{ width: 2, height: 44, borderRadius: 1, background: lineColor }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: 8, paddingTop: 8, paddingBottom: 8 }}>
          <div style={{ ...text.callout1, color: primaryColor, textDecoration: isPast ? 'line-through' : 'none', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bookingServiceNames(booking)}
          </div>
          <div style={{ ...text.caption1, color: secondaryColor, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatRub(bookingTotal(booking))}
          </div>
        </div>
      </div>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: 16, paddingRight: 8, paddingTop: 8, paddingBottom: 8 }}>
        <div style={{ ...text.body2, color: primaryColor }}>{booking.time}</div>
        <div style={{ ...text.caption1, color: secondaryColor }}>{endTime}</div>
      </div>
    </div>
  )
}

// Дивайдер: 8px высота с центрированной 1px-линией divider-low.
function Divider() {
  return (
    <div style={{ height: 8, display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '100%', height: 1, background: 'var(--color-divider-low)' }} />
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  padding: 12,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

// vuesax/linear/add (24×24).
function AddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/arrow-down (12×12).
function ArrowDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="var(--color-on-surface-secondary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/arrow-left|right (20×20).
function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d={dir === 'left' ? 'M12.5 4L6.5 10L12.5 16' : 'M7.5 4L13.5 10L7.5 16'}
        stroke="var(--color-on-surface-secondary)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
