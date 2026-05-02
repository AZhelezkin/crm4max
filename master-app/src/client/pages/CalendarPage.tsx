import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Schedule } from '@client/types'
import ToggleSwitch from '@/components/ToggleSwitch'
import { text } from '@/styles/typography'

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

function isWorkingDay(day: dayjs.Dayjs, schedule: Schedule | null): boolean {
  if (!schedule) return true
  const isoDay = day.day() || 7
  return schedule.workingDays.includes(isoDay)
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const { masterId, service, date, time, remind, setDateTime, setRemind } = useBookingStore()

  const today = dayjs().startOf('day')
  const [step, setStep] = useState<'date' | 'time'>('date')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [selectedDate, setSelectedDate] = useState(date || today.format('YYYY-MM-DD'))
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [availability, setAvailability] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (masterId) {
      mastersApi.getById(masterId)
        .then((m) => setSchedule(m.schedule))
        .catch(() => {})
    }
  }, [masterId])

  // Batch-загрузка доступности слотов для всех 3 месяцев
  useEffect(() => {
    if (masterId && service) {
      const from = today.format('YYYY-MM-DD')
      const to = today.startOf('month').add(2, 'month').endOf('month').format('YYYY-MM-DD')
      mastersApi.getAvailability(masterId, from, to, service.id)
        .then(setAvailability)
        .catch(() => {})
    }
  }, [masterId, service])

  useEffect(() => {
    if (step === 'time' && masterId && service && selectedDate) {
      setSlotsLoading(true)
      mastersApi.getSlots(masterId, selectedDate, service.id)
        .then(setSlots)
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false))
    }
  }, [step, masterId, service, selectedDate])

  const handleSelectDate = (d: dayjs.Dayjs) => {
    const val = d.format('YYYY-MM-DD')
    setSelectedDate(val)
    setDateTime(val, '')
    setStep('time')
  }

  const handleSelectTime = (t: string) => {
    setDateTime(selectedDate, t)
    navigate('/book/confirm')
  }

  const selectedTime = time && date === selectedDate ? time : ''
  const selectedDayjs = dayjs(selectedDate)
  const months = [0, 1, 2].map((offset) => today.startOf('month').add(offset, 'month'))

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header 56px ── */}
      <div style={{
        height: 56, background: 'var(--color-background)',
        display: 'flex', alignItems: 'center', padding: '0 14px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Back arrow */}
        <button
          onClick={() => step === 'time' ? setStep('date') : navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15.57 17.93L9.5 12l6.07-6.07" stroke="var(--color-on-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.5 12H9.67" stroke="var(--color-on-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Service info — centered */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div style={{
            ...text.callout, color: 'var(--color-on-surface)',
            lineHeight: '22px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {step === 'date' ? 'Выберите дату' : 'Выберите время'}
          </div>
          {service && (
            <div style={{
              color: 'var(--color-on-surface-secondary)', ...text.footnote, marginTop: 2,
              lineHeight: '17px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {service.name}
            </div>
          )}
        </div>

        <div style={{ width: 36 }} />
      </div>

      {/* ── Date step — Calendar ── */}
      {step === 'date' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px', paddingBottom: 32 }}>
          {months.map((monthStart, mi) => (
            <div key={monthStart.format('YYYY-MM')} style={{ marginTop: mi === 0 ? 24 : 24 }}>

              {/* Month title */}
              <div style={{
                ...text.footnoteStrong, color: 'var(--color-on-surface)',
                marginBottom: 16, textTransform: 'capitalize',
              }}>
                {monthStart.format('MMMM YYYY')}
              </div>

              {/* Day-of-week labels */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                marginBottom: 8,
              }}>
                {DAY_NAMES.map((d) => (
                  <div key={d} style={{
                    textAlign: 'center', ...text.action,
                    color: 'var(--color-on-surface-muted)',
                    padding: '4px 0',
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {buildMonthGrid(monthStart.year(), monthStart.month()).map((week, wi) => (
                <div key={wi} style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 1, marginBottom: 1,
                }}>
                  {week.map((day, di) => {
                    if (!day) return <div key={di} />
                    const val = day.format('YYYY-MM-DD')
                    const isPast = day.isBefore(today)
                    const isToday = day.isSame(today)
                    const isSelected = val === selectedDate
                    const working = isWorkingDay(day, schedule)
                    const disabled = isPast || !working
                    const isWeekend = di >= 5 // Сб, Вс

                    // Цвета ячеек:
                    //   dark blue = есть свободные слоты (availability[val] === true)
                    //   gray      = нет свободных слотов (availability[val] === false)
                    //   black     = прошёл, нерабочий, или данные не загружены
                    const hasSlots = availability[val] // true | false | undefined
                    let bg = 'transparent'
                    let cellOpacity = 1
                    if (isSelected) {
                      bg = 'var(--color-primary-surface)'
                    } else if (isPast) {
                      cellOpacity = 0.5
                    } else if (hasSlots === true) {
                      bg = 'rgba(0, 122, 254, 0.3)'
                    } else if (hasSlots === false) {
                      bg = 'var(--color-divider-low)'
                      cellOpacity = 0.5
                    } else {
                      // undefined — нерабочий день или данные ещё грузятся
                      cellOpacity = 0.5
                    }

                    // Text color
                    let textColor = 'var(--color-on-surface)'
                    if (isSelected) textColor = 'var(--color-on-primary-surface)'
                    else if (isWeekend) textColor = 'var(--color-error-surface-accented)'

                    return (
                      <button
                        key={val}
                        onClick={() => !disabled && handleSelectDate(day)}
                        disabled={disabled}
                        style={{
                          aspectRatio: '54 / 53',
                          borderRadius: 12,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          ...text.bodyStrong,
                          background: bg,
                          color: textColor,
                          opacity: cellOpacity,
                          border: 'none',
                          cursor: disabled ? 'default' : 'pointer',
                          position: 'relative',
                          padding: 0,
                        }}
                      >
                        {day.date()}
                        {/* Today indicator — red bar */}
                        {isToday && (
                          <span style={{
                            position: 'absolute',
                            bottom: 6,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 12, height: 2,
                            borderRadius: 1,
                            background: 'var(--color-error-surface-accented)',
                          }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Time step ── */}
      {step === 'time' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 24px' }}>

          {/* Selected date card */}
          <div style={{
            background: 'var(--color-surface)', borderRadius: 20,
            padding: '14px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 16, marginBottom: 24,
          }}>
            <div>
              <div style={{ ...text.callout, color: 'var(--color-on-surface)' }}>
                {selectedDayjs.format('D MMMM, dddd')}
              </div>
              <div style={{ color: 'var(--color-on-surface-secondary)', ...text.footnote, marginTop: 2 }}>Дата</div>
            </div>
            <button onClick={() => setStep('date')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 20h9" stroke="var(--color-on-surface-secondary)" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" stroke="var(--color-on-surface-secondary)" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Slots label */}
          <div style={{
            ...text.footnote, color: 'var(--color-on-surface-secondary)', fontWeight: 600,
            marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            Свободные слоты
          </div>

          {/* Slots grid */}
          {slotsLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', padding: '32px 0' }}>Загрузка...</div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', padding: '32px 0' }}>Нет свободных слотов</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
              {slots.map((s) => {
                const isSel = selectedTime === s
                return (
                  <button
                    key={s}
                    onClick={() => handleSelectTime(s)}
                    style={{
                      padding: '14px 0', borderRadius: 12,
                      ...text.bodyMedium,
                      background: isSel ? 'var(--color-primary-surface)' : 'var(--color-surface)',
                      color: isSel ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          )}

          {/* Remind toggle */}
          <div style={{
            background: 'var(--color-surface)', borderRadius: 20,
            padding: '14px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 24,
          }}>
            <div>
              <div style={{ ...text.callout, color: 'var(--color-on-surface)' }}>Напомнить за 1 час</div>
              <div style={{ color: 'var(--color-on-surface-secondary)', ...text.footnote, marginTop: 2 }}>Бот напишет в MAX</div>
            </div>
            <ToggleSwitch
              checked={remind}
              onChange={setRemind}
              aria-label="Напомнить за 1 час"
            />
          </div>

        </div>
      )}
    </div>
  )
}
