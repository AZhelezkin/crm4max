import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mastersApi } from '@/api/masters.api'
import { useBookingStore } from '@/store/booking.store'
import type { Master } from '@/types'
import { discountedPrice } from '@/types'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'

export default function ServiceSelectPage() {
  const navigate = useNavigate()
  const { masterId, setService } = useBookingStore()
  const [master, setMaster] = useState<Master | null>(null)

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => navigate('/'))
  }, [masterId, navigate])

  const handleSelect = (service: Master['categories'][0]['services'][0]) => {
    setService(service)
    navigate('/book/calendar')
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="Выберите услугу" />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {master?.categories.map((cat) => (
          <div key={cat.id}>
            {cat.name && (
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
                {cat.name}
              </div>
            )}
            {cat.services.map((s) => (
              <Card key={s.id} onClick={() => handleSelect(s)} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{s.name}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
                      {s.durationMin} мин
                    </div>
                    {s.description && (
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
                        {s.description}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    {s.discountPercent ? (
                      <>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {((discountedPrice(s.price, s.discountPercent) ?? s.price) / 100).toLocaleString('ru-RU')} ₽
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>
                          {(s.price / 100).toLocaleString('ru-RU')} ₽
                        </div>
                      </>
                    ) : (
                      <div style={{ fontWeight: 600 }}>{(s.price / 100).toLocaleString('ru-RU')} ₽</div>
                    )}
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 18 }}>›</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
