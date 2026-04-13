import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Category, Master, Service } from '@client/types'
import { discountedPrice, formatPrice } from '@client/types'
import BottomNav from '@client/components/BottomNav'

export default function CategorySelectPage() {
  const navigate = useNavigate()
  const { masterId, setService } = useBookingStore()
  const [master, setMaster] = useState<Master | null>(null)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!masterId) { navigate('/'); return }
    mastersApi.getById(masterId).then(setMaster).catch(() => navigate('/'))
  }, [masterId, navigate])

  const isSearching = query.trim().length > 0
  const q = query.trim().toLowerCase()

  /* Search results: services matching query across all categories */
  const searchResults = useMemo(() => {
    if (!master || !isSearching) return []
    const results: { service: Service; category: Category }[] = []
    for (const cat of master.categories) {
      for (const s of cat.services) {
        if (
          s.name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q)
        ) {
          results.push({ service: s, category: cat })
        }
      }
    }
    return results
  }, [master, q, isSearching])

  const handleSelectService = (service: Service) => {
    setService(service)
    navigate('/book/calendar')
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0F0F11', paddingBottom: 95 }}>

      {/* Header: back arrow + search input */}
      <div style={{
        background: '#0F0F11',
        display: 'flex', alignItems: 'center', padding: '14px 14px 10px',
        position: 'sticky', top: 0, zIndex: 10, gap: 10,
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

        {/* Search field — matches Global Search.svg: rx=12, bg #454757, h=44 */}
        <div style={{
          flex: 1, height: 44, background: '#454757', borderRadius: 12,
          display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
        }}>
          {/* Search icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" stroke="#7D7D7F" strokeWidth="1.5"/>
            <path d="M16 16L20 20" stroke="#7D7D7F" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск услуг..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#D3D4D6', fontSize: 15, fontFamily: 'inherit',
              padding: 0,
            }}
          />
          {/* Clear button — X from Global Search.svg */}
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="#7D7D7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {isSearching && (
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {searchResults.length === 0 && (
            <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>Ничего не найдено</div>
          )}
          {searchResults.map(({ service: s, category: cat }) => {
            const dPrice = discountedPrice(s.price, s.discountPercent)
            return (
              <button
                key={s.id}
                onClick={() => handleSelectService(s)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center',
                  background: '#25262B', borderRadius: 20,
                  minHeight: 78, padding: '0 16px 0 0',
                  cursor: 'pointer', border: 'none', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 23, flexShrink: 0,
                  overflow: 'hidden', background: '#454757',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 12px 0 16px',
                }}>
                  {cat.photo
                    ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 22 }}>✂️</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: '14px 0' }}>
                  <div style={{
                    fontWeight: 600, fontSize: 15, color: '#D3D4D6',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {s.name}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: dPrice !== null ? '#CE4259' : '#7D7D7F',
                    }}>
                      {formatPrice(dPrice ?? s.price)}
                    </span>
                    {dPrice !== null && (
                      <span style={{ fontSize: 12, color: '#7D7D7F', textDecoration: 'line-through' }}>
                        {formatPrice(s.price)}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: '#454757' }}>·</span>
                    <span style={{ fontSize: 12, color: '#7D7D7F' }}>{cat.name}</span>
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginLeft: 8 }}>
                  <path d="M7 5L11 9L7 13" stroke="#7D7D7F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )
          })}
        </div>
      )}

      {/* Category list — hidden when searching */}
      {!isSearching && (
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!master && (
          <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>Загрузка...</div>
        )}
        {master && master.categories.length === 0 && (
          <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>Нет категорий</div>
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
                background: '#25262B',
                borderRadius: 20,
                minHeight: 78, padding: '0 16px 0 0',
                cursor: 'pointer', border: 'none', textAlign: 'left',
              }}
            >
              {/* Category avatar */}
              <div style={{
                width: 46, height: 46, borderRadius: 23, flexShrink: 0,
                overflow: 'hidden', background: '#454757',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 12px 0 16px',
              }}>
                {cat.photo
                  ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 22 }}>✂️</span>
                }
              </div>

              {/* Name + service count + preview */}
              <div style={{ flex: 1, minWidth: 0, padding: '14px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: '#D3D4D6' }}>{cat.name}</span>
                  {hasDiscount && (
                    <span style={{
                      background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                      fontSize: 11, fontWeight: 700, borderRadius: 6,
                      padding: '2px 8px', lineHeight: '18px',
                    }}>
                      % скидки
                    </span>
                  )}
                </div>
                <div style={{
                  color: '#7D7D7F', fontSize: 13,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {cat.description || preview}
                </div>
              </div>

              {/* Chevron */}
              <div style={{ flexShrink: 0, marginLeft: 8 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M7 5L11 9L7 13" stroke="#7D7D7F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          )
        })}
      </div>
      )}

      <BottomNav />
    </div>
  )
}
