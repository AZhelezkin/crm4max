import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi, type ClientSlot } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Schedule } from '@client/types'
import ToggleSwitch from '@/components/ToggleSwitch'
import { text } from '@/styles/typography'
import CalendarDateSkeleton from '@client/components/CalendarDateSkeleton'
import SlotsGridSkeleton from '@client/components/SlotsGridSkeleton'
import { daysAheadBucket, timeBucket, trackEvent } from '@/lib/metrics'

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
  const location = useLocation()
  // Режим выбора слота для приёма абонемента: пришли с PackageBookingPage с индексом.
  const routeState = location.state as { sessionIndex?: number; step?: 'date' | 'time' } | null
  const sessionIndex = routeState?.sessionIndex
  const isSession = typeof sessionIndex === 'number'
  const { masterId, service, date, time, remind, slots: pkgSlots, setDateTime, setSlot, setRemind } = useBookingStore()

  const today = dayjs().startOf('day')
  const [step, setStep] = useState<'date' | 'time'>(routeState?.step === 'time' && date ? 'time' : 'date')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [selectedDate, setSelectedDate] = useState(date || today.format('YYYY-MM-DD'))
  const [slots, setSlots] = useState<ClientSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)

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
        .then((a) => { setAvailability(a); setAvailabilityLoaded(true) })
        .catch(() => { setAvailabilityLoaded(true) })
    }
  }, [masterId, service])

  useEffect(() => {
    if (step === 'time' && masterId && service && selectedDate) {
      setSlotsLoading(true)
      mastersApi.getSlots(masterId, selectedDate, service.id)
        .then((s) => {
          setSlots(s)
          // Самокоррекция кеша availability: если getSlots вернул пусто, помечаем
          // дату как занятую, чтобы клетка перестала светиться синим при возврате.
          // Случается, например, для сегодняшнего дня, когда последний слот стартанул
          // между моментом загрузки availability и кликом по клетке.
          setAvailability((prev) => prev[selectedDate] === (s.length > 0)
            ? prev
            : { ...prev, [selectedDate]: s.length > 0 })
        })
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false))
    }
  }, [step, masterId, service, selectedDate])

  const handleSelectDate = (d: dayjs.Dayjs) => {
    trackEvent('client_booking_date_selected', { days_ahead_bucket: daysAheadBucket(d.startOf('day').diff(today, 'day')) })
    const val = d.format('YYYY-MM-DD')
    setSelectedDate(val)
    setStep('time')
  }

  // Слот несёт client-local time (для UI) + master-дату/время (каноника для записи).
  // В store кладём master-дату/время, чтобы запись ушла в правильный слот мастера.
  const handleSelectTime = (s: ClientSlot) => {
    trackEvent('client_booking_time_selected', { time_bucket: timeBucket(s.time) })
    if (isSession) {
      // Абонемент: записываем слот выбранного приёма и возвращаемся к списку приёмов.
      setSlot(sessionIndex, s.masterDate, s.masterTime)
      navigate(-1)
    } else {
      setDateTime(s.masterDate, s.masterTime)
      navigate('/book/confirm')
    }
  }

  const selectedDayjs = dayjs(selectedDate)
  const months = [0, 1, 2].map((offset) => today.startOf('month').add(offset, 'month'))

  // В режиме абонемента убираем слоты, уже выбранные для других приёмов (по master-ключу).
  const takenKeys = isSession
    ? new Set(pkgSlots.filter((p, i) => i !== sessionIndex && p).map((p) => `${p.date} ${p.time}`))
    : new Set<string>()
  const visibleSlots = slots.filter((s) => !takenKeys.has(`${s.masterDate} ${s.masterTime}`))

  const headerTitle = step === 'date' ? 'Выберите дату' : 'Выберите время'
  const headerSubtitle = isSession
    ? `Приём ${sessionIndex + 1} из ${service?.sessionsCount ?? ''}`
    : (service?.name ?? '')

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
          {headerSubtitle && (
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
              {headerSubtitle}
            </div>
          )}
        </div>

        {/* trailing slot 44×44 для симметрии */}
        <div style={{ width: 44, height: 44, marginLeft: 'auto', flexShrink: 0 }} />
      </div>

      {/* ── Date step — Calendar ──
            Пока schedule или availability ещё не загрузились, показываем
            skeleton-grid (CalendarDateSkeleton) с тем же layout-ом. */}
      {step === 'date' && (!schedule || !availabilityLoaded) && (
        <CalendarDateSkeleton />
      )}

      {step === 'date' && schedule && availabilityLoaded && (
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

              {/* Days grid — Figma «_calendar2Cell»: minH=56, padding 8/4, rounded 10, callout1.
                  daysGrid в Figma имеет `gap-x-px gap-y-px` (1px) — между залитыми
                  ячейками просвечивает body-background и образует тонкие разделители. */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 1,
              }}>
                {buildMonthGrid(monthStart.year(), monthStart.month()).flat().map((day, i) => {
                  if (!day) return <div key={i} style={{ minHeight: 56 }} />
                  const val = day.format('YYYY-MM-DD')
                  const isPast = day.isBefore(today)
                  const isToday = day.isSame(today)
                  const isSelected = val === selectedDate
                  const working = isWorkingDay(day, schedule)
                  // disabled: прошлое или (не рабочий день И нет слотов). availability в
                  // поясе клиента — при разнице поясов день мастера может «перетечь» на
                  // соседнюю клиентскую дату, тогда availability===true разблокирует её.
                  const disabled = isPast || (availability[val] !== true && !working)
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

      {/* ── Time step (Figma form: top=180, padding 8/16, gap=8, flex-col items=center) ── */}
      {step === 'time' && (
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '8px 16px 32px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>

          {/* Selected date listItem (Figma 8534:14569).
              bg=surfaceTransparent, rx=20, padding 16/20, gap 12. */}
          <button
            onClick={() => setStep('date')}
            style={{
              background: 'var(--color-surface-transparent)',
              borderRadius: 20,
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              border: 'none', cursor: 'pointer',
              width: '100%', textAlign: 'left',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                ...text.callout1, color: 'var(--color-on-surface)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {selectedDayjs.format('D MMMM, dd')}
              </div>
              <div style={{
                ...text.caption2, color: 'var(--color-on-surface-secondary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Дата
              </div>
            </div>
            {/* vuesax/linear/edit-2 16×16 — точные path из Figma 8175:13372 */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M8.84 2.4L3.36667 8.19333C3.16 8.41333 2.96 8.84667 2.92 9.14667L2.67333 11.3067C2.58667 12.0867 3.14667 12.62 3.92 12.4867L6.06667 12.12C6.36667 12.0667 6.78667 11.8467 6.99333 11.62L12.4667 5.82667C13.4133 4.82667 13.84 3.68667 12.3667 2.29333C10.9 0.913333 9.78667 1.4 8.84 2.4Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7.92667 3.36667C8.21333 5.20667 9.70667 6.61333 11.56 6.8" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 14.6667H14" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Slots block (Figma 8534:14570 "selectSlots", flex-col gap 12) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>

            {/* Section title — Figma title (selectSlots → items-start): padding 24/8/8/8,
                плашка shrink-0, поэтому прижата к левому краю.
                text: caption3Caps, color onSurfaceSoften. */}
            <div style={{ padding: '24px 8px 8px' }}>
              <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface-soften)' }}>
                ДОСТУПНЫЕ СЛОТЫ
              </span>
            </div>

            {/* Grid 4×N — Figma _select: h=69, padding 12/0, rx=18, gap 8.
                bg=surfaceTransparent, text=callout1 onSurface. */}
            {slotsLoading ? (
              <SlotsGridSkeleton />
            ) : visibleSlots.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', padding: '32px 0' }}>Нет свободных слотов</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {visibleSlots.map((s) => {
                  const isSel = s.masterDate === date && s.masterTime === time
                  return (
                    <button
                      key={`${s.masterDate} ${s.masterTime}`}
                      onClick={() => handleSelectTime(s)}
                      style={{
                        height: 69, padding: '12px 0', borderRadius: 18,
                        background: isSel
                          ? 'var(--color-active-surface)'
                          : 'var(--color-surface-transparent)',
                        color: isSel
                          ? 'var(--color-interactive-element-accented)'
                          : 'var(--color-on-surface)',
                        ...text.callout1,
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {s.time}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Remind listItem (Figma 8534:14571) — same shell as date card. */}
          <div style={{
            background: 'var(--color-surface-transparent)',
            borderRadius: 20,
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                ...text.callout1, color: 'var(--color-on-surface)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Напомнить за 1 час
              </div>
              <div style={{
                ...text.caption2, color: 'var(--color-on-surface-secondary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Бот напишет в МАХ
              </div>
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
