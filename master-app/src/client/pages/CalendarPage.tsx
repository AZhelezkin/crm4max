import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Schedule } from '@client/types'

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
    <div style={{ minHeight: '100dvh', background: '#0F0F11', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header 56px ── */}
      <div style={{
        height: 56, background: '#0F0F11',
        display: 'flex', alignItems: 'center', padding: '0 14px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Back arrow */}
        <button
          onClick={() => step === 'time' ? setStep('date') : navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15.57 17.93L9.5 12l6.07-6.07" stroke="#D3D4D6" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.5 12H9.67" stroke="#D3D4D6" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Service info — centered */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div style={{
            fontWeight: 600, fontSize: 17, color: '#D3D4D6',
            lineHeight: '22px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {step === 'date' ? 'Выберите дату' : 'Выберите время'}
          </div>
          {service && (
            <div style={{
              color: '#7D7D7F', fontSize: 13, marginTop: 2,
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
                fontSize: 13, fontWeight: 600, color: '#D3D4D6',
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
                    textAlign: 'center', fontSize: 14, fontWeight: 500,
                    color: '#6E6E70',
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
                      bg = '#007AFE'
                    } else if (isPast) {
                      cellOpacity = 0.5
                    } else if (hasSlots === true) {
                      bg = 'rgba(0, 122, 254, 0.3)'
                    } else if (hasSlots === false) {
                      bg = '#454757'
                      cellOpacity = 0.5
                    } else {
                      // undefined — нерабочий день или данные ещё грузятся
                      cellOpacity = 0.5
                    }

                    // Text color
                    let textColor = '#D3D4D6'
                    if (isSelected) textColor = '#FFFFFF'
                    else if (isWeekend) textColor = '#CE4259'

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
                          fontSize: 15, fontWeight: 600,
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
                            background: '#CE4259',
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
            background: '#25262B', borderRadius: 20,
            padding: '14px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 16, marginBottom: 24,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 17, color: '#D3D4D6' }}>
                {selectedDayjs.format('D MMMM, dddd')}
              </div>
              <div style={{ color: '#7D7D7F', fontSize: 13, marginTop: 2 }}>Дата</div>
            </div>
            <button onClick={() => setStep('date')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 20h9" stroke="#7D7D7F" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" stroke="#7D7D7F" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Slots label */}
          <div style={{
            fontSize: 13, color: '#7D7D7F', fontWeight: 600,
            marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            Свободные слоты
          </div>

          {/* Slots grid */}
          {slotsLoading ? (
            <div style={{ textAlign: 'center', color: '#7D7D7F', padding: '32px 0' }}>Загрузка...</div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#7D7D7F', padding: '32px 0' }}>Нет свободных слотов</div>
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
                      fontSize: 15, fontWeight: 500,
                      background: isSel ? '#007AFE' : '#25262B',
                      color: isSel ? '#fff' : '#D3D4D6',
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
            background: '#25262B', borderRadius: 20,
            padding: '14px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 24,
          }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 17, color: '#D3D4D6' }}>Напомнить за 1 час</div>
              <div style={{ color: '#7D7D7F', fontSize: 13, marginTop: 2 }}>Бот напишет в MAX</div>
            </div>
            <button
              onClick={() => setRemind(!remind)}
              style={{
                width: 51, height: 31, borderRadius: 16,
                background: remind ? '#007AFE' : '#3A3A3C',
                position: 'relative', transition: 'background 0.2s',
                flexShrink: 0, border: 'none', cursor: 'pointer', padding: 0,
              }}  
            >
              <span style={{
                position: 'absolute', top: 3,
                left: remind ? 23 : 3,
                width: 25, height: 25, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
