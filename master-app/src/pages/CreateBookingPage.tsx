import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookingsApi } from '@/api/bookings.api'
import { servicesApi } from '@/api/services.api'
import { useAuthStore } from '@/store/auth.store'
import type { Service } from '@/types'
import PageHeader from '@/components/PageHeader'
import Input from '@/components/Input'
import Button from '@/components/Button'

export default function CreateBookingPage() {
  const navigate = useNavigate()
  const { master } = useAuthStore()
  const [services, setServices] = useState<Service[]>([])

  const [serviceId, setServiceId] = useState('')
  const [date, setDate]           = useState('')
  const [time, setTime]           = useState('')
  const [clientName, setClientName] = useState('')
  const [slots, setSlots]         = useState<string[]>([])
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    servicesApi.list().then(setServices).catch(() => {})
  }, [])

  useEffect(() => {
    if (master?.id && serviceId && date) {
      fetch(`/api/schedule/${master.id}/slots?date=${date}&serviceId=${serviceId}`)
        .then((r) => r.json())
        .then(setSlots)
        .catch(() => {})
    }
  }, [master?.id, serviceId, date])

  const handleSave = async () => {
    if (!master || !serviceId || !date || !time) return
    setSaving(true)
    try {
      await bookingsApi.create({
        masterId: master.id,
        serviceId,
        date,
        time,
      })
      navigate('/bookings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="Создать запись" />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Услуга */}
        <div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Услуга</div>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 15 }}
          >
            <option value="">Выберите услугу</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.durationMin} мин</option>
            ))}
          </select>
        </div>

        {/* Клиент */}
        <Input label="Клиент" value={clientName} onChange={setClientName} placeholder="Имя клиента" />

        {/* Дата */}
        <div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Дата</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 15 }}
          />
        </div>

        {/* Время */}
        {slots.length > 0 && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Время</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => setTime(s)}
                  style={{
                    padding: '10px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500,
                    background: time === s ? 'var(--color-primary)' : 'var(--color-card)',
                    color: time === s ? '#fff' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !serviceId || !date || !time}
          fullWidth
        >
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  )
}
