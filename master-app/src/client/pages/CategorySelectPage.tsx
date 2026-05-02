import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Master } from '@client/types'
import { text } from '@/styles/typography'

export default function CategorySelectPage() {
  const navigate = useNavigate()
  const { masterId } = useBookingStore()
  const [master, setMaster] = useState<Master | null>(null)

  useEffect(() => {
    if (!masterId) { navigate('/'); return }
    mastersApi.getById(masterId).then(setMaster).catch(() => navigate('/'))
  }, [masterId, navigate])

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 20 }}>

      {/* Header: back arrow + title + search icon */}
      <div style={{
        height: 56, background: 'var(--color-background)',
        display: 'flex', alignItems: 'center', padding: '0 14px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15.57 17.93L9.5 12l6.07-6.07" stroke="var(--color-on-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.5 12H9.67" stroke="var(--color-on-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1, ...text.subheadline, color: 'var(--color-on-surface)', textAlign: 'center' }}>
          Выберите категорию
        </div>
        {/* Search icon → navigate to ServiceSelectPage in search mode */}
        <button
          onClick={() => navigate('/book/services?search=1')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="var(--color-on-surface)" strokeWidth="1.5"/>
            <path d="M16 16L20 20" stroke="var(--color-on-surface)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Category list */}
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!master && (
          <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>Загрузка...</div>
        )}
        {master && master.categories.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>Нет категорий</div>
        )}
        {master?.categories.map((cat) => {
          const hasDiscount = cat.services.some((s) => s.discountPercent)
          const preview = cat.services.map((s) => s.name).join(', ')

          return (
            <button
              key={cat.id}
              onClick={() => navigate(`/book/services?categoryId=${cat.id}`)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center',
                background: 'var(--color-surface)',
                borderRadius: 20,
                minHeight: 78, padding: '0 16px 0 0',
                cursor: 'pointer', border: 'none', textAlign: 'left',
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 23, flexShrink: 0,
                overflow: 'hidden', background: 'var(--color-divider-low)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 12px 0 16px',
              }}>
                {cat.photo
                  ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ ...text.titleSmall }}>✂️</span>
                }
              </div>

              <div style={{ flex: 1, minWidth: 0, padding: '14px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ ...text.body, color: 'var(--color-on-surface)' }}>{cat.name}</span>
                  {hasDiscount && (
                    <span style={{
                      background: 'rgba(206,66,89,0.3)', color: 'var(--color-error-surface-accented)',
                      ...text.overline, borderRadius: 6,
                      padding: '2px 8px', lineHeight: '18px',
                    }}>
                      % скидки
                    </span>
                  )}
                </div>
                <div style={{
                  color: 'var(--color-on-surface-secondary)', ...text.footnote,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {cat.description || preview}
                </div>
              </div>

              <div style={{ flexShrink: 0, marginLeft: 8 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M7 5L11 9L7 13" stroke="var(--color-on-surface-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          )
        })}
      </div>

    </div>
  )
}
