import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Master, Service } from '@client/types'
import { discountedPrice, formatPrice } from '@client/types'
import BottomNav from '@client/components/BottomNav'

export default function ServiceSelectPage() {
  const navigate = useNavigate()
  const { masterId, setService } = useBookingStore()
  const [master, setMaster] = useState<Master | null>(null)

  useEffect(() => {
    if (!masterId) { navigate('/'); return }
    mastersApi.getById(masterId).then(setMaster).catch(() => navigate('/'))
  }, [masterId, navigate])

  const handleSelect = (service: Service) => {
    setService(service)
    navigate('/book/calendar')
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0F0F11', paddingBottom: 95 }}>

      {/* ── Шапка 116px ──────────────────────────────────────────────── */}
      <div style={{
        height: 58, background: '#0F0F11',
        display: 'flex', alignItems: 'center', padding: '0 14px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15.57 17.93L9.5 12l6.07-6.07" stroke="#D3D4D6" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.5 12H9.67" stroke="#D3D4D6" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: '#D3D4D6', textAlign: 'center' }}>
          Выберите услугу
        </div>

        <div style={{ width: 40 }} />
      </div>

      {/* ── Список услуг ─────────────────────────────────────────────── */}
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {!master && (
          <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>Загрузка...</div>
        )}
        {master && (!master.categories || master.categories.length === 0) && (
          <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>Нет услуг</div>
        )}
        {master?.categories.map((cat) => (
          <div key={cat.id}>
            {/* Заголовок категории (добавление) */}
            {cat.name && (
              <div style={{
                fontSize: 13, fontWeight: 600, color: '#7D7D7F',
                marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {cat.name}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {cat.services.map((s) => {
                const dPrice = discountedPrice(s.price, s.discountPercent)
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    style={{
                      width: '100%', height: 106,
                      background: '#25262B', borderRadius: 20,
                      padding: '14px 20px 12px 22px', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'flex-start',
                    }}
                  >
                    {/* Контент слева */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Название — 1 строка */}
                      <div style={{
                        fontWeight: 600, fontSize: 15, color: '#D3D4D6',
                        lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {s.name}
                      </div>

                      {/* Описание — 2 строки (34px) */}
                      <div style={{
                        color: '#7D7D7F', fontSize: 13, marginTop: 2,
                        height: 34, overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        lineHeight: '17px',
                      }}>
                        {s.description || '\u00A0'}
                      </div>

                      {/* Цена + старая цена + бейдж скидки */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
                        lineHeight: '18px',
                      }}>
                        <span style={{
                          fontWeight: 600, fontSize: 15,
                          color: dPrice !== null ? '#CE4259' : '#D3D4D6',
                        }}>
                          {formatPrice(dPrice ?? s.price)}
                        </span>
                        {dPrice !== null && (
                          <span style={{ fontSize: 13, color: '#7D7D7F', textDecoration: 'line-through' }}>
                            {formatPrice(s.price)}
                          </span>
                        )}
                        {s.discountPercent && (
                          <span style={{
                            marginLeft: 'auto',
                            background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                            fontSize: 11, fontWeight: 700, borderRadius: 6,
                            padding: '2px 8px', lineHeight: '18px',
                          }}>
                            % скидки
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Шеврон — по центру блока название+описание */}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginLeft: 8, marginTop: 10 }}>
                      <path d="M7 5L11 9L7 13" stroke="#7D7D7F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
