import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@/api/masters.api'
import { useBookingStore } from '@/store/booking.store'

dayjs.locale('ru')

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Возвращает массив недель (строк по 7 ячеек) для месяца */
function buildMonthGrid(year: number, month: number): (dayjs.Dayjs | null)[][] {
  const firstDay = dayjs(new Date(year, month, 1))
  // ISO weekday: 1=Пн..7=Вс
  const startOffset = (firstDay.day() || 7) - 1
  const daysInMonth = firstDay.daysInMonth()

  const cells: (dayjs.Dayjs | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => firstDay.add(i, 'day')),
  ]
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (dayjs.Dayjs | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const { masterId, service, date, time, remind, setDateTime, setRemind } = useBookingStore()

  const today = dayjs().startOf('day')
  const [step, setStep] = useState<'date' | 'time'>('date')
  const [viewMonth, setViewMonth] = useState(today.startOf('month'))
  const [selectedDate, setSelectedDate] = useState(date || today.format('YYYY-MM-DD'))
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)

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

  // Build months to display (current viewMonth + next 2)
  const months = [0, 1, 2].map((offset) => viewMonth.add(offset, 'month'))

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
          style={{ background: 'none', color: '#2688EB', fontSize: 20 }}
        >←</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 17 }}>
            {step === 'date' ? 'Выберите дату' : 'Выберите время'}
          </div>
          <div style={{ color: '#8E8E93', fontSize: 13 }}>{service?.name}</div>
        </div>
        <button onClick={() => navigate('/')} style={{ background: 'none', color: '#8E8E93', fontSize: 18 }}>✕</button>
      </div>

      {/* ── ШАГ 1: Выбор даты ── */}
      {step === 'date' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
          {/* Навигация по месяцам */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}
              disabled={viewMonth.isSame(today.startOf('month'))}
              style={{
                background: 'none', color: viewMonth.isSame(today.startOf('month')) ? '#3A3A3C' : '#2688EB',
                fontSize: 20, padding: '4px 8px',
              }}
            >‹</button>
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {viewMonth.format('MMMM YYYY')}
            </span>
            <button
              onClick={() => setViewMonth((m) => m.add(1, 'month'))}
              style={{ background: 'none', color: '#2688EB', fontSize: 20, padding: '4px 8px' }}
            >›</button>
          </div>

          {/* День недели заголовки */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 13, color: '#8E8E93', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Сетка дней */}
          {buildMonthGrid(viewMonth.year(), viewMonth.month()).map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
              {week.map((day, di) => {
                if (!day) return <div key={di} />
                const val = day.format('YYYY-MM-DD')
                const isPast = day.isBefore(today)
                const isToday = day.isSame(today)
                const isSelected = val === selectedDate
                const isWeekend = day.day() === 0 || day.day() === 6

                return (
                  <button
                    key={val}
                    onClick={() => !isPast && handleSelectDate(day)}
                    disabled={isPast}
                    style={{
                      aspectRatio: '1', borderRadius: 10, fontSize: 15, fontWeight: isToday ? 700 : 400,
                      background: isSelected
                        ? '#2688EB'
                        : isToday
                          ? '#1A3A5C'
                          : isPast
                            ? 'transparent'
                            : '#1C1C1E',
                      color: isSelected
                        ? '#fff'
                        : isPast
                          ? '#3A3A3C'
                          : isWeekend
                            ? '#FF3B30'
                            : '#fff',
                      border: isToday && !isSelected ? '1px solid #2688EB' : 'none',
                    }}
                  >
                    {day.date()}
                  </button>
                )
              })}
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
            <button onClick={() => setStep('date')} style={{ background: 'none', color: '#8E8E93', fontSize: 18 }}>✏️</button>
          </div>

          <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 600, marginBottom: 12, letterSpacing: 0.5 }}>
            ДОСТУПНЫЕ СЛОТЫ
          </div>

          {slotsLoading ? (
            <div style={{ textAlign: 'center', color: '#8E8E93', padding: '32px 0' }}>Загрузка...</div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8E8E93', padding: '32px 0' }}>
              Нет свободных слотов
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
              {slots.map((s) => {
                const isSelected = selectedTime === s
                return (
                  <button
                    key={s}
                    onClick={() => handleSelectTime(s)}
                    style={{
                      padding: '14px 0', borderRadius: 12, fontSize: 15, fontWeight: 500,
                      background: isSelected ? '#2688EB' : '#1C1C1E',
                      color: isSelected ? '#fff' : '#fff',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          )}

          {/* Тоггл напоминания */}
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
