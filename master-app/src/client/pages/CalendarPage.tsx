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

/* ── Toolbar icon ──────────────────────────────────────────────────────────── */

function IcoArrowLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12l6.07 6.07" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.5 12H3.67" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round"/>
    </svg>
  )
}

function ToolbarButton({ onClick, ariaLabel, children }: {
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 44, height: 44, borderRadius: 22,
        background: 'var(--color-background)',
        border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

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

  // Batch availability for visible 3 months
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

  const headerTitle = step === 'date' ? 'Выберите дату' : 'Выберите время'

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Toolbar (Figma toolbarTop). h=56, padding 6/12, gap=8.
            Title abs-centered: callout1 + caption2 — как в ServiceDetailPage. */}
      <div style={{
        position: 'relative',
        height: 56,
        padding: '6px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <ToolbarButton
          onClick={() => step === 'time' ? setStep('date') : navigate(-1)}
          ariaLabel="Назад"
        >
          <IcoArrowLeft />
        </ToolbarButton>

        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          textAlign: 'center', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
            {headerTitle}
          </div>
          {service && (
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
              {service.name}
            </div>
          )}
        </div>

        {/* trailing slot 44×44 для симметрии */}
        <div style={{ width: 44, height: 44, marginLeft: 'auto', flexShrink: 0 }} />
      </div>

      {/* ── Date step — Calendar ── */}
      {step === 'date' && (
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '0 16px 32px',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          {months.map((monthStart) => (
            <div key={monthStart.format('YYYY-MM')} style={{
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>

              {/* Month label — Figma «_calendar2Control»: padding 14/8/14/4, pl=6 на контейнере. */}
              <div style={{ paddingLeft: 6 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '14px 4px 14px 8px',
                  borderRadius: 100,
                }}>
                  <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface-secondary)' }}>
                    {monthStart.format('MMMM YYYY')}
                  </span>
                </div>
              </div>

              {/* Day-of-week labels — Figma «_calendar2Day»: h=48, body2Medium, secondary. */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                width: '100%',
              }}>
                {DAY_NAMES.map((d) => (
                  <div key={d} style={{
                    height: 48,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...text.body2Medium,
                    color: 'var(--color-on-surface-secondary)',
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid — Figma «_calendar2Cell»: minH=56, padding 8/4, rounded 10, callout1. */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              }}>
                {buildMonthGrid(monthStart.year(), monthStart.month()).flat().map((day, i) => {
                  if (!day) return <div key={i} style={{ minHeight: 56 }} />
                  const val = day.format('YYYY-MM-DD')
                  const isPast = day.isBefore(today)
                  const isToday = day.isSame(today)
                  const isSelected = val === selectedDate
                  const working = isWorkingDay(day, schedule)
                  const disabled = isPast || !working
                  const isWeekend = (day.day() || 7) >= 6 // Сб, Вс

                  // Cell bg per Figma:
                  //   active-surface           = доступны слоты или выбранный день (#003D7F)
                  //   secondary-surface-muted  = нет слотов (#1E1F26)
                  //   transparent              = past / нерабочий / данные ещё грузятся
                  const hasSlots = availability[val]
                  let bg = 'transparent'
                  if (isSelected || hasSlots === true) {
                    bg = 'var(--color-active-surface)'
                  } else if (hasSlots === false) {
                    bg = 'var(--color-secondary-surface-muted)'
                  }

                  // Text color per Figma:
                  //   weekend регуляр  → error-surface-accented (#DA7182)
                  //   weekend прошлый  → error-element-muted    (#9B3143)
                  //   обычный регуляр  → interactive-element-accented (#F2F2F5)
                  //   обычный прошлый  → interactive-element-muted    (#5B5E73)
                  let textColor: string
                  if (isWeekend) {
                    textColor = (isPast || (!working && hasSlots !== true && !isSelected))
                      ? 'var(--color-error-element-muted)'
                      : 'var(--color-error-surface-accented)'
                  } else {
                    textColor = (isPast || (!working && hasSlots !== true && !isSelected))
                      ? 'var(--color-interactive-element-muted)'
                      : 'var(--color-interactive-element-accented)'
                  }

                  return (
                    <button
                      key={val}
                      onClick={() => !disabled && handleSelectDate(day)}
                      disabled={disabled}
                      style={{
                        minHeight: 56,
                        padding: '8px 4px',
                        borderRadius: 10,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 8,
                        ...text.callout1,
                        background: bg,
                        color: textColor,
                        border: 'none',
                        cursor: disabled ? 'default' : 'pointer',
                        position: 'relative',
                      }}
                    >
                      {day.date()}
                      {/* Today indicator — небольшая красная риска под цифрой */}
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
