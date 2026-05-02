import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Master } from '@client/types'
import { text } from '@/styles/typography'

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

/* ── Toolbar round button (44×44, bg=background) ───────────────────────────── */

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
        width: 48, height: 48, borderRadius: 24,
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

/* ── Страница ──────────────────────────────────────────────────────────────── */

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

      {/* ── Header (Figma toolbarTop). h=56, padding 6/12, items-center, gap=8.
            Простой flex: back / [flex-1 title по центру] / search. Без absolute,
            чтобы клики по кнопкам гарантированно проходили на мобильных WebView. */}
      <div style={{
        height: 56,
        padding: '4px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <ToolbarButton onClick={() => navigate(-1)} ariaLabel="Назад">
          <IcoArrowLeft />
        </ToolbarButton>

        <span style={{
          flex: 1, minWidth: 0, textAlign: 'center',
          ...text.callout1, color: 'var(--color-on-surface)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          Выберите категорию
        </span>

        <ToolbarButton onClick={() => navigate('/book/services?search=1')} ariaLabel="Поиск">
          <IcoSearch />
        </ToolbarButton>
      </div>

      {/* ── Список категорий. Figma: padding 16/8, gap=8, items на surfaceTransparent. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 16px' }}>
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
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--color-surface-transparent)',
                borderRadius: 20,
                padding: '16px 16px 16px 20px',
                cursor: 'pointer', border: 'none', textAlign: 'left',
              }}
            >
              {/* Аватар категории 44×44 ø */}
              <div style={{
                width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                overflow: 'hidden', background: 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cat.photo
                  ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ ...text.titleSmall, color: 'var(--color-on-surface-secondary)' }}>✂️</span>
                }
              </div>

              {/* Title + опц. бейдж + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{cat.name}</span>
                  {hasDiscount && (
                    /* Бейдж «% СКИДКИ»: h=20, px=6, label3Caps. См. MasterCardPage. */
                    <span style={{
                      borderRadius: 4,
                      display: 'inline-block',
                      height: 20,
                      padding: '0 6px',
                      boxSizing: 'border-box',
                      background: 'var(--color-error-surface-lite)',
                      color: 'var(--color-on-error-surface-lite)',
                      ...text.label3Caps,
                      lineHeight: '20px',
                    }}>
                      % скидки
                    </span>
                  )}
                </div>
                {/* Description — text.caption2 (14/16/500), до 2 строк */}
                <div style={{
                  color: 'var(--color-on-surface-secondary)', ...text.caption2,
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {cat.description || preview}
                </div>
              </div>

              {/* Chevron → 16×16 (interactiveElementSecondary) */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M5.5 3L10.5 8L5.5 13" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )
        })}
      </div>

    </div>
  )
}
