import { useEffect, useState } from 'react'
import { scheduleApi } from '@/api/schedule.api'
import type { Schedule } from '@/types'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/Button'
import Input from '@/components/Input'

const DAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
]

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startTime, setStartTime]     = useState('09:00')
  const [endTime, setEndTime]         = useState('20:00')
  const [breakStart, setBreakStart]   = useState('')
  const [breakEnd, setBreakEnd]       = useState('')
  const [buffer, setBuffer]           = useState('0')
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    scheduleApi.get().then((s) => {
      if (!s) return
      setSchedule(s)
      setWorkingDays(s.workingDays)
      setStartTime(s.startTime)
      setEndTime(s.endTime)
      setBreakStart(s.breakStart ?? '')
      setBreakEnd(s.breakEnd ?? '')
      setBuffer(String(s.bufferMinutes))
    }).catch(() => {})
  }, [])

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await scheduleApi.upsert({
        workingDays,
        startTime,
        endTime,
        breakStart: breakStart || undefined,
        breakEnd: breakEnd || undefined,
        bufferMinutes: Number(buffer),
      })
      setSchedule(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="График работы" />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Рабочие дни */}
        <div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 500 }}>
            Рабочие дни
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {DAYS.map((d) => (
              <button
                key={d.value}
                onClick={() => toggleDay(d.value)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: 500,
                  background: workingDays.includes(d.value) ? 'var(--color-primary)' : 'var(--color-card)',
                  color: workingDays.includes(d.value) ? '#fff' : 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Часы работы */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Начало" value={startTime} onChange={setStartTime} placeholder="09:00" />
          <Input label="Конец" value={endTime} onChange={setEndTime} placeholder="20:00" />
        </div>

        {/* Перерыв */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Перерыв с" value={breakStart} onChange={setBreakStart} placeholder="13:00" />
          <Input label="Перерыв до" value={breakEnd} onChange={setBreakEnd} placeholder="14:00" />
        </div>

        {/* Буфер */}
        <Input
          label="Буфер между клиентами (мин)"
          value={buffer}
          onChange={setBuffer}
          placeholder="0"
          type="number"
        />

        <Button onClick={handleSave} disabled={saving} fullWidth>
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  )
}
