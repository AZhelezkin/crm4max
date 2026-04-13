import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Category, Master, Service } from '@client/types'
import { discountedPrice, formatPrice } from '@client/types'
import BottomNav from '@client/components/BottomNav'

/* ── Highlight matching substring in blue (#007AFE) ──────────────────────── */

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#007AFE' }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function ServiceSelectPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const categoryId = searchParams.get('categoryId')
  const isSearchMode = searchParams.get('search') === '1'
  const { masterId, setService } = useBookingStore()
  const [master, setMaster] = useState<Master | null>(null)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!masterId) { navigate('/'); return }
    mastersApi.getById(masterId).then(setMaster).catch(() => navigate('/'))
  }, [masterId, navigate])

  useEffect(() => {
    if (isSearchMode && inputRef.current) inputRef.current.focus()
  }, [isSearchMode, master])

  const handleSelect = (service: Service) => {
    setService(service)
    navigate('/book/calendar')
  }

  /* ── Normal mode: filter by category ──────────────────────────────────── */
  const categories: Category[] = master
    ? (categoryId
        ? master.categories.filter((c) => c.id === categoryId)
        : master.categories)
    : []

  /* ── Search mode ────────────────────────────────────────────────────── */
  // With categoryId → search only within that category (from ServiceSelect)
  // Without categoryId → search across all categories (from CategorySelect)
  const globalSearch = isSearchMode && !categoryId
  const q = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!master || !q) return [] as { category: Category; services: Service[] }[]
    const searchIn = globalSearch ? master.categories : categories
    if (globalSearch) {
      // Group by category
      const grouped: { category: Category; services: Service[] }[] = []
      for (const cat of searchIn) {
        const matched = cat.services.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            cat.name.toLowerCase().includes(q),
        )
        if (matched.length > 0) grouped.push({ category: cat, services: matched })
      }
      return grouped
    }
    // Flat for per-category search
    const matched = searchIn.flatMap((cat) =>
      cat.services
        .filter((s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
        .map((s) => ({ category: cat, services: [s] })),
    )
    return matched
  }, [master, q, globalSearch, categories])

  const isSearching = isSearchMode && q.length > 0

  return (
    <div style={{ minHeight: '100dvh', background: '#0F0F11', paddingBottom: 95 }}>

      {/* -- Header -- */}
      <div style={{
        height: 72, background: '#0F0F11',
        display: 'flex', alignItems: 'center', padding: '0 14px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Back arrow */}
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15.57 17.93L9.5 12l6.07-6.07" stroke="#D3D4D6" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.5 12H9.67" stroke="#D3D4D6" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {isSearchMode ? (
          /* Search input — Global Search.svg style: rx=12, bg #454757, h=44 */
          <div style={{
            flex: 1, height: 44, background: '#454757', borderRadius: 12,
            display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
            marginRight: 8,
          }}>
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
                color: '#D3D4D6', fontSize: 15, fontFamily: 'inherit', padding: 0,
              }}
            />
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
        ) : (
          <>
            <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: '#D3D4D6', textAlign: 'center' }}>
              Выберите услугу
            </div>
            <button
              onClick={() => navigate(`/book/services?search=1${categoryId ? `&categoryId=${categoryId}` : ''}`)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#D3D4D6" strokeWidth="1.5"/>
                <path d="M16 16L20 20" stroke="#D3D4D6" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* -- Search results -- */}
      {isSearching && (
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {searchResults.length === 0 && (
            <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>Ничего не найдено</div>
          )}
          {searchResults.map(({ category: cat, services }) => (
            <div key={cat.id}>
              {/* Category header — only in global search */}
              {globalSearch && (
                <div style={{
                  fontSize: 13, fontWeight: 600, color: '#7D7D7F',
                  marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  <Highlight text={cat.name} query={q} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {services.map((s) => {
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: 15, color: '#D3D4D6',
                          lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          <Highlight text={s.name} query={q} />
                        </div>
                        <div style={{
                          color: '#7D7D7F', fontSize: 13, marginTop: 2,
                          height: 34, overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          lineHeight: '17px',
                        }}>
                          {s.description ? <Highlight text={s.description} query={q} /> : '\u00A0'}
                        </div>
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
      )}

      {/* -- Service list (normal mode or search mode with empty query) -- */}
      {!isSearching && (
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!master && (
            <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>Загрузка...</div>
          )}
          {master && categories.length === 0 && !isSearchMode && (
            <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>Нет услуг</div>
          )}
          {!isSearchMode && categories.map((cat) => (
            <div key={cat.id}>
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: 15, color: '#D3D4D6',
                          lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {s.name}
                        </div>
                        <div style={{
                          color: '#7D7D7F', fontSize: 13, marginTop: 2,
                          height: 34, overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          lineHeight: '17px',
                        }}>
                          {s.description || '\u00A0'}
                        </div>
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
      )}

      <BottomNav />
    </div>
  )
}
