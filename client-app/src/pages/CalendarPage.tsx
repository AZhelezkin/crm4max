import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@/api/masters.api'
import { useBookingStore } from '@/store/booking.store'
import type { Schedule } from '@/types'

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
  const isoDay = day.day() || 7 // 1=Пн ... 7=Вс
  return schedule.workingDays.includes(isoDay)
}

// Иконка карандаша
function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 20h9" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" stroke="#8E8E93" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
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

  // Загружаем расписание мастера
  useEffect(() => {
    if (masterId) {
      mastersApi.getById(masterId)
        .then((m) => setSchedule(m.schedule))
        .catch(() => {})
    }
  }, [masterId])

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
  }

  const handleNext = () => navigate('/book/confirm')

  const selectedTime = time && date === selectedDate ? time : ''
  const selectedDayjs = dayjs(selectedDate)

  // Показываем текущий месяц + 2 следующих
  const months = [0, 1, 2].map((offset) => today.startOf('month').add(offset, 'month'))

  return (
    <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column' }}>

      {/* Шапка */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px',
        background: '#000',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => step === 'time' ? setStep('date') : navigate(-1)}
          style={{ background: 'none', color: '#2688EB', fontSize: 22 }}
        >←</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 17 }}>
            {step === 'date' ? 'Выберите дату' : 'Выберите время'}
          </div>
          <div style={{ color: '#8E8E93', fontSize: 13 }}>{service?.name}</div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: '#2C2C2E', borderRadius: 8,
            width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#8E8E93', fontSize: 16, flexShrink: 0,
          }}
        >✕</button>
      </div>

      {/* ── ШАГ 1: Выбор даты — скроллируемые месяцы ── */}
      {step === 'date' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 32px' }}>
          {months.map((monthStart) => (
            <div key={monthStart.format('YYYY-MM')} style={{ marginBottom: 28 }}>

              {/* Заголовок месяца */}
              <div style={{
                fontSize: 15, fontWeight: 600,
                color: '#fff', marginBottom: 10,
                textTransform: 'capitalize',
              }}>
                {monthStart.format('MMMM YYYY')}
              </div>

              {/* Дни недели */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                {DAY_NAMES.map((d, i) => (
                  <div key={d} style={{
                    textAlign: 'center', fontSize: 12,
                    color: i >= 5 ? '#FF3B30' : '#8E8E93',
                    padding: '4px 0',
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Сетка дней */}
              {buildMonthGrid(monthStart.year(), monthStart.month()).map((week, wi) => (
                <div key={wi} style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 3, marginBottom: 3,
                }}>
                  {week.map((day, di) => {
                    if (!day) return <div key={di} />
                    const val = day.format('YYYY-MM-DD')
                    const isPast = day.isBefore(today)
                    const isToday = day.isSame(today)
                    const isSelected = val === selectedDate
                    const isWeekend = day.day() === 0 || day.day() === 6
                    const working = isWorkingDay(day, schedule)
                    const disabled = isPast || !working

                    let bg = 'transparent'
                    if (isSelected) bg = '#2688EB'
                    else if (!disabled) bg = '#1A3050'

                    let color = '#fff'
                    if (disabled) color = '#3A3A3C'
                    else if (isWeekend) color = '#FF3B30'

                    return (
                      <button
                        key={val}
                        onClick={() => !disabled && handleSelectDate(day)}
                        disabled={disabled}
                        style={{
                          aspectRatio: '1', borderRadius: 10,
                          fontSize: 15, fontWeight: isToday ? 700 : 400,
                          background: bg, color,
                          position: 'relative',
                          border: isToday && !isSelected ? '1px solid #2688EB' : 'none',
                        }}
                      >
                        {day.date()}
                        {isToday && !isSelected && (
                          <span style={{
                            position: 'absolute', bottom: 3, left: '50%',
                            transform: 'translateX(-50%)',
                            width: 4, height: 4, borderRadius: '50%',
                            background: '#FF3B30',
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

      {/* ── ШАГ 2: Выбор времени ── */}
      {step === 'time' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>

          {/* Выбранная дата */}
          <div style={{
            background: '#1C1C1E', borderRadius: 14, padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 24,
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>
                {selectedDayjs.format('D MMMM, dddd')}
              </div>
              <div style={{ color: '#8E8E93', fontSize: 13 }}>Дата</div>
            </div>
            <button onClick={() => setStep('date')} style={{ background: 'none' }}>
              <PencilIcon />
            </button>
          </div>

          <div style={{
            fontSize: 12, color: '#8E8E93', fontWeight: 600,
            marginBottom: 12, letterSpacing: 0.5,
          }}>
            ДОСТУПНЫЕ СЛОТЫ
          </div>

          {slotsLoading ? (
            <div style={{ textAlign: 'center', color: '#8E8E93', padding: '32px 0' }}>Загрузка...</div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8E8E93', padding: '32px 0' }}>
              Нет свободных слотов
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8, marginBottom: 24,
            }}>
              {slots.map((s) => {
                const isSel = selectedTime === s
                return (
                  <button
                    key={s}
                    onClick={() => handleSelectTime(s)}
                    style={{
                      padding: '14px 0', borderRadius: 12,
                      fontSize: 15, fontWeight: 500,
                      background: isSel ? '#2688EB' : '#1C1C1E',
                      color: '#fff',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          )}

          {/* Напомнить за 1 час */}
          <div style={{
            background: '#1C1C1E', borderRadius: 14, padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 24,
          }}>
            <div>
              <div style={{ fontWeight: 500 }}>Напомнить за 1 час</div>
              <div style={{ color: '#8E8E93', fontSize: 13 }}>Бот напишет в MAX</div>
            </div>
            <button
              onClick={() => setRemind(!remind)}
              style={{
                width: 51, height: 31, borderRadius: 16,
                background: remind ? '#2688EB' : '#3A3A3C',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: remind ? 23 : 3,
                width: 25, height: 25, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          <button
            onClick={handleNext}
            disabled={!selectedTime}
            style={{
              width: '100%', padding: 16, borderRadius: 14,
              background: selectedTime ? '#2688EB' : '#1C1C1E',
              color: selectedTime ? '#fff' : '#8E8E93',
              fontWeight: 600, fontSize: 16,
            }}
          >
            Продолжить
          </button>
        </div>
      )}
    </div>
  )
}
