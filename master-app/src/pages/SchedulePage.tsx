import { text } from '@/styles/typography'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scheduleApi } from '@/api/schedule.api'
import { Step1Form } from '@/pages/OnboardingPage'

// «График работы» (Настройки → График работы). Переиспользует форму шага 3
// онбординга (Step1Form): рабочие дни, время работы, обед, буфер. Сохраняет сразу
// через scheduleApi.upsert и возвращается назад.
export default function SchedulePage() {
  const navigate = useNavigate()

  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startTime, setStartTime]     = useState('09:00')
  const [endTime, setEndTime]         = useState('17:00')
  const [buffer, setBuffer]           = useState(0)
  const [hasBreak, setHasBreak]       = useState(false)
  const [breakStart, setBreakStart]   = useState('13:00')
  const [breakEnd, setBreakEnd]       = useState('14:00')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    scheduleApi.get().then((s) => {
      if (!s) return
      setWorkingDays(s.workingDays)
      setStartTime(s.startTime)
      setEndTime(s.endTime)
      setBuffer(s.bufferMinutes)
      if (s.breakStart && s.breakEnd) {
        setHasBreak(true)
        setBreakStart(s.breakStart)
        setBreakEnd(s.breakEnd)
      }
    }).catch(() => {})
  }, [])

  const toggleDay = (d: number) =>
    setWorkingDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort())

  const handleSave = async () => {
    setError(null)
    if (hasBreak && breakEnd <= breakStart) {
      setError('Конец обеда должен быть позже его начала')
      return
    }
    setSaving(true)
    try {
      await scheduleApi.upsert({
        workingDays,
        startTime,
        endTime,
        bufferMinutes: buffer,
        // null при выключенном перерыве — иначе старый перерыв не удалится из БД.
        breakStart: hasBreak ? breakStart : null,
        breakEnd: hasBreak ? breakEnd : null,
      })
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  const footerDisabled = saving || workingDays.length === 0

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Step1Form
        workingDays={workingDays} toggleDay={toggleDay}
        startTime={startTime} setStartTime={setStartTime}
        endTime={endTime} setEndTime={setEndTime}
        buffer={buffer} setBuffer={setBuffer}
        hasBreak={hasBreak} setHasBreak={setHasBreak}
        breakStart={breakStart} setBreakStart={setBreakStart}
        breakEnd={breakEnd} setBreakEnd={setBreakEnd}
        onBack={() => navigate(-1)}
        footer={
          <>
            {error && (
              <div style={{
                marginBottom: 12, padding: '12px 14px', borderRadius: 14,
                background: 'rgba(209, 50, 50, 0.12)', color: 'var(--color-error-surface-accented)',
                ...text.action, lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}
            <button
              type="button"
              disabled={footerDisabled}
              onClick={() => { void handleSave() }}
              style={{
                width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout1,
                cursor: footerDisabled ? 'default' : 'pointer',
                background: footerDisabled ? 'var(--color-secondary-surface-muted)' : 'var(--color-primary-surface)',
                color: footerDisabled ? 'var(--color-interactive-element-muted)' : 'var(--color-on-primary-surface)',
              }}
            >
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </>
        }
      />
    </div>
  )
}
