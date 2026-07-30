import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mastersApi, type RecentMaster } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import { text } from '@/styles/typography'

// Список последних мастеров клиента (открывается из бота: startapp=cmasters).
// Тап по мастеру → старт флоу записи к нему: кладём masterId в booking-store и
// уходим на карточку мастера (как по ссылке шеринга). Макет 9972-58957.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '—'
}

export default function RecentMastersPage() {
  const navigate = useNavigate()
  const { setMasterId, setMasterSource } = useBookingStore()
  const [masters, setMasters] = useState<RecentMaster[] | null>(null)

  useEffect(() => {
    mastersApi.getRecentMasters().then(setMasters).catch(() => setMasters([]))
  }, [])

  const pick = (m: RecentMaster) => {
    setMasterId(m.id)
    setMasterSource('recent')
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px 24px' }}>
        {masters === null ? null : masters.length === 0 ? (
          <div style={{ ...text.body, color: 'var(--color-on-surface-secondary)', textAlign: 'center', marginTop: 40 }}>
            Пока нет мастеров. Чтобы записаться в первый раз, попросите у мастера ссылку.
          </div>
        ) : (
          masters.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pick(m)}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                background: 'var(--color-surface-transparent)',
                borderRadius: 20, padding: '16px 20px',
                border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 20, flexShrink: 0, overflow: 'hidden',
                background: m.photo
                  ? 'var(--color-surface)'
                  : 'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {m.photo
                  ? <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ ...text.label3Caps, color: 'var(--color-on-surface)' }}>{initials(m.name)}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.name}
                </span>
                {m.description && (
                  <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
                    {m.description}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
