import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import type { Category } from '@/types'
import { formatPrice, formatDuration, discountedPrice } from '@/types'

type Tab = 'services' | 'photos' | 'reviews'

export default function ProfilePage() {
  const { master } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('services')

  const totalServices = master?.categories.reduce((acc, c) => acc + c.services.length, 0) ?? 0

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', overflowX: 'hidden' }}>

      {/* Шапка */}
      <div style={{ position: 'relative', paddingTop: 16, paddingBottom: 20, textAlign: 'center' }}>

        {/* Рейтинг */}
        {!!master?.rating && (
          <div style={{
            position: 'absolute', top: 16, right: 16,
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--color-card)', borderRadius: 20,
            padding: '4px 10px',
          }}>
            <span style={{ color: '#FFD60A', fontSize: 14 }}>★</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{master.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Аватар */}
        <div style={{
          width: 90, height: 90, borderRadius: '50%',
          border: '3px solid var(--color-primary)',
          overflow: 'hidden', margin: '0 auto 12px',
          background: 'var(--color-card2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {master?.photo
            ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 36 }}>👤</span>
          }
        </div>

        {/* Имя */}
        <div style={{ fontSize: 20, fontWeight: 700 }}>{master?.name || 'Мастер'}</div>

        {/* Специальность */}
        {master?.description && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>
            {master.description}
          </div>
        )}

        {/* Кнопки действий */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, padding: '0 16px' }}>
          {[
            {
              label: 'Услуги', action: () => navigate('/services'),
              icon: <EditIcon active />,
            },
            {
              label: 'Профиль', action: () => navigate('/about'),
              icon: <EditIcon active />,
            },
            {
              label: 'Изменить', action: () => navigate('/about'),
              icon: <EditIcon active />,
            },
            {
              label: 'Ещё', action: () => {},
              icon: <MoreIcon active />,
            },
          ].map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6,
                background: 'var(--color-card)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                padding: '10px 4px',
                cursor: 'pointer',
              }}
            >
              {icon}
              <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Табы */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 16px' }}>
        {([
          { key: 'services', label: 'Услуги', count: totalServices },
          { key: 'photos',   label: 'Фото',   count: 0 },
          { key: 'reviews',  label: 'Отзывы', count: 0 },
        ] as { key: Tab; label: string; count: number }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, background: 'none', border: 'none',
              padding: '12px 0', cursor: 'pointer',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontSize: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-card2)',
                color: activeTab === tab.key ? '#fff' : 'var(--color-text-secondary)',
                borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 600,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Контент */}
      <div style={{ padding: '12px 16px 80px' }}>
        {activeTab === 'services' && (
          master?.categories.length
            ? <ServicesList categories={master.categories} />
            : <EmptyState
                text="Услуги ещё не добавлены"
                action={{ label: '+ Добавить услуги', onClick: () => navigate('/services') }}
              />
        )}
        {activeTab === 'photos' && (() => {
          const allPhotos = (master?.categories ?? [])
            .flatMap(c => c.services)
            .flatMap(s => s.workPhotos ?? [])
            .sort((a, b) => a.order - b.order)
          if (!allPhotos.length) return <EmptyState text="Фото работ появятся здесь" />
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, margin: '0 -16px' }}>
              {allPhotos.map((p) => (
                <div key={p.id} style={{ aspectRatio: '1', overflow: 'hidden' }}>
                  <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          )
        })()}
        {activeTab === 'reviews' && <EmptyState text="Отзывы появятся после первых записей" />}
      </div>
    </div>
  )
}

// ─── ServicesList ─────────────────────────────────────────────────────────────

function ServicesList({ categories }: { categories: Category[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {categories.map((cat) => {
        const expanded = expandedIds.has(cat.id)
        return (
          <div key={cat.id}>
            {/* Категория */}
            <div
              onClick={() => toggle(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--color-card)', borderRadius: expanded ? 'var(--radius) var(--radius) 0 0' : 'var(--radius)',
                padding: '12px 14px', cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {cat.name}
                  {cat.services.some((s) => s.discountPercent) && (
                    <span style={{
                      background: 'var(--color-danger)', color: '#fff',
                      fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                    }}>
                      % скидки
                    </span>
                  )}
                </div>
                {cat.description && (
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat.description}
                  </div>
                )}
              </div>
              <span style={{
                color: 'var(--color-text-secondary)', fontSize: 16, lineHeight: 1,
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}>▾</span>
            </div>

            {/* Услуги — раскрываются */}
            {expanded && (
              <div style={{ background: 'var(--color-card)', borderRadius: '0 0 var(--radius) var(--radius)', overflow: 'hidden' }}>
                {cat.services.map((s, idx) => {
                  const dPrice = discountedPrice(s.price, s.discountPercent)
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderTop: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 2 }}>
                          {formatDuration(s.durationMin, s.durationMax)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        {dPrice !== null ? (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>
                              {formatPrice(dPrice)}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>
                              {formatPrice(s.price)}
                            </div>
                            <div style={{
                              background: 'var(--color-danger)', color: '#fff',
                              fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '1px 5px',
                            }}>
                              {s.discountPercent}% СКИДКА
                            </div>
                          </>
                        ) : (
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{formatPrice(s.price)}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>{text}</div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 16, background: 'var(--color-primary)',
            color: '#fff', border: 'none', borderRadius: 'var(--radius)',
            padding: '10px 20px', fontSize: 15, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ─── Иконки ──────────────────────────────────────────────────────────────────

function CalendarIcon({ active }: { active?: boolean }) {
  const c = active ? '#2688EB' : '#8E8E93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="3" stroke={c} strokeWidth="2" />
      <path d="M8 2v4M16 2v4M3 9h18" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <rect x="7" y="13" width="3" height="3" rx="1" fill={c} />
      <rect x="14" y="13" width="3" height="3" rx="1" fill={c} />
    </svg>
  )
}

function AddIcon({ active }: { active?: boolean }) {
  const c = active ? '#2688EB' : '#8E8E93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" />
      <path d="M12 8v8M8 12h8" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function EditIcon({ active }: { active?: boolean }) {
  const c = active ? '#2688EB' : '#8E8E93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MoreIcon({ active }: { active?: boolean }) {
  const c = active ? '#2688EB' : '#8E8E93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2" fill={c} />
      <circle cx="12" cy="12" r="2" fill={c} />
      <circle cx="19" cy="12" r="2" fill={c} />
    </svg>
  )
}
