import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Master, Service } from '@client/types'
import { discountedPrice, formatPrice, masterServiceList } from '@client/types'
import { text } from '@/styles/typography'
import ServiceListSkeleton from '@client/components/ServiceListSkeleton'

/* ── Иконки toolbar (vuesax/linear, 24×24, stroke=onSurfaceSoften) ─────────── */

function IcoArrowLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12l6.07 6.07" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.5 12H3.67" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round"/>
    </svg>
  )
}

function IcoSearch() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11.5 21c5.246 0 9.5-4.254 9.5-9.5S16.746 2 11.5 2 2 6.254 2 11.5 6.254 21 11.5 21Z" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="m22 22-2-2" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ToolbarButton({ onClick, ariaLabel, children }: {
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 44, height: 44, borderRadius: 22,
        background: 'var(--color-background)',
        border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

/* ── Highlight matching substring ──────────────────────────────────────────── */

function Highlight({ text: t, query }: { text: string; query: string }) {
  if (!query) return <>{t}</>
  const idx = t.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{t}</>
  return (
    <>
      {t.slice(0, idx)}
      <span style={{ color: 'var(--color-primary-surface)' }}>{t.slice(idx, idx + query.length)}</span>
      {t.slice(idx + query.length)}
    </>
  )
}

/* ── Карточка услуги (Figma 8534:13301 → listItem) ─────────────────────────── */

function ServiceItem({ service, query, onSelect }: {
  service: Service
  query: string
  onSelect: (s: Service) => void
}) {
  const dPrice = discountedPrice(service.price, service.discountPercent)
  const hasDiscount = dPrice !== null

  return (
    <button
      onClick={() => onSelect(service)}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--color-surface-transparent)',
        borderRadius: 20,
        padding: '16px 16px 16px 20px',
        border: 'none', cursor: 'pointer',
      }}
    >
      {/* Колонка контента: title-stack + price-row, gap 16 между ними */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Title + description */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            ...text.callout1, color: 'var(--color-on-surface)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <Highlight text={service.name} query={query} />
          </div>
          {service.description && (
            <div style={{
              ...text.caption2, color: 'var(--color-on-surface-secondary)',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {service.description}
            </div>
          )}
        </div>

        {/* Price row: actual + (если скидка) crossed-out + бейдж «% СКИДКИ» */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            ...text.callout1,
            color: hasDiscount ? 'var(--color-error-surface-accented)' : 'var(--color-on-surface)',
          }}>
            {formatPrice(dPrice ?? service.price)}
          </span>
          {hasDiscount && (
            <span style={{
              ...text.caption2,
              color: 'var(--color-on-surface-muted)',
              textDecoration: 'line-through',
            }}>
              {formatPrice(service.price)}
            </span>
          )}
          {service.discountPercent && (
            /* Figma: rounded=6, padding pt-8.5 pb-7.5 px-8, h=30, Label 2 CAPS,
               errorSurfaceLite/onErrorSurfaceLite. inline-block + height:30 + lineHeight:30
               — см. подход с бейджем категорий. */
            <span style={{
              borderRadius: 6,
              display: 'inline-block',
              height: 30,
              padding: '0 8px',
              boxSizing: 'border-box',
              background: 'var(--color-error-surface-lite)',
              color: 'var(--color-on-error-surface-lite)',
              ...text.label2Caps,
              lineHeight: '30px',
            }}>
              % скидки
            </span>
          )}
        </div>
      </div>

      {/* Chevron 16×16 */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M5.5 3L10.5 8L5.5 13" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

/* ── Страница ──────────────────────────────────────────────────────────────── */

export default function ServiceSelectPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
    navigate('/book/service')
  }

  /* ── Плоский список всех услуг мастера. Категории убраны; «Прочее» бэкенд
       уже скрывает от клиентов, так что flatMap безопасен. ──────────────── */
  const allServices = useMemo<Service[]>(
    () => (master ? masterServiceList(master) : []),
    [master],
  )

  /* ── Search mode ──────────────────────────────────────────────────────── */
  const q = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!q) return [] as Service[]
    return allServices.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q),
    )
  }, [allServices, q])

  const isSearching = isSearchMode && q.length > 0

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 20 }}>

      {/* ── Header (Figma toolbarTop). h=56, padding 6/12, gap=8. */}
      <div style={{
        height: 56,
        padding: '6px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <ToolbarButton onClick={() => navigate(-1)} ariaLabel="Назад">
          <IcoArrowLeft />
        </ToolbarButton>

        {isSearchMode ? (
          /* Search input — Figma searchTop. bg=--color-background, h=44 (py=10 px=14),
             rounded=22, text 18/24/400 в interactiveElementAccented. Без левой иконки —
             только текст/курсор + X-кнопка очистки 20×20 справа. */
          <div style={{
            flex: 1, minWidth: 0,
            height: 44, background: 'var(--color-background)', borderRadius: 22,
            display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
          }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              style={{
                flex: 1, minWidth: 0,
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--color-interactive-element-accented)',
                fontSize: 18, lineHeight: '24px', fontWeight: 400,
                fontFamily: 'inherit', padding: 0,
              }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                aria-label="Очистить"
                style={{
                  width: 20, height: 20, padding: 0, flexShrink: 0,
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1L9 9M9 1L1 9" stroke="var(--color-interactive-element-accented)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        ) : (
          <>
            <span style={{
              flex: 1, minWidth: 0, textAlign: 'center',
              ...text.callout1, color: 'var(--color-on-surface)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Выберите услугу
            </span>
            <ToolbarButton
              onClick={() => navigate('/book/services?search=1')}
              ariaLabel="Поиск"
            >
              <IcoSearch />
            </ToolbarButton>
          </>
        )}
      </div>

      {/* ── Список (Figma list: padding 16/8, gap 8) — плоский, без категорий ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 16px' }}>
        {!master && <ServiceListSkeleton />}

        {/* Search mode */}
        {isSearching && searchResults.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>Ничего не найдено</div>
        )}
        {isSearching && searchResults.map((s) => (
          <ServiceItem key={s.id} service={s} query={q} onSelect={handleSelect} />
        ))}

        {/* Normal mode */}
        {master && !isSearchMode && allServices.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>Нет услуг</div>
        )}
        {!isSearchMode && allServices.map((s) => (
          <ServiceItem key={s.id} service={s} query="" onSelect={handleSelect} />
        ))}
      </div>

    </div>
  )
}
