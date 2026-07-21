import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { text } from '@/styles/typography'
import { servicesApi, type PopularServiceGroup } from '@/api/services.api'
import { HeroHeader } from '@/components/onboardingShared'

// Справочник популярных услуг (Figma 10132-39802): секции с заголовками и списком
// услуг. Тап по услуге подставляет её название в форму создания и закрывает справочник.
export default function PopularServicesPortal({ visible, onClose, onSelect }: {
  visible: boolean
  onClose: () => void
  onSelect: (name: string) => void
}) {
  const [groups, setGroups] = useState<PopularServiceGroup[]>([])
  const [loaded, setLoaded] = useState(false)
  // Поиск по названию (кнопка в шапке, макет 10132-39802).
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!visible) return
    servicesApi.getPopular()
      .then((g) => { setGroups(g); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [visible])

  // Сброс поиска при закрытии справочника.
  useEffect(() => { if (!visible) { setSearchOpen(false); setSearch('') } }, [visible])

  if (!visible) return null

  const q = search.trim().toLowerCase()
  const shownGroups = q
    ? groups
        .map((g) => ({ ...g, services: g.services.filter((s) => s.name.toLowerCase().includes(q)) }))
        .filter((g) => g.services.length > 0)
    : groups

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--gradient-hero-background)',
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      zIndex: 210,
      display: 'flex', flexDirection: 'column',
    }}>
      <HeroHeader
        title="Популярные услуги"
        onBack={onClose}
        trailing={
          <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-background)', borderRadius: 22 }}>
            <button type="button" aria-label="Поиск" onClick={() => setSearchOpen((v) => { if (v) setSearch(''); return !v })}
              style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', color: 'var(--color-on-surface)' }}>
              <SearchIcon />
            </button>
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px calc(48px + env(safe-area-inset-bottom))' }}>
        {searchOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-transparent)', borderRadius: 12, padding: '10px 16px', marginBottom: 8 }}>
            <span style={{ flexShrink: 0, display: 'inline-flex', color: 'var(--color-interactive-element-secondary)' }}><SearchIcon /></span>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск услуги"
              style={{ ...text.body2, flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-on-surface)', padding: 0 }}
            />
          </div>
        )}
        {shownGroups.map((g) => (
          <div key={g.section} style={{ marginBottom: 8 }}>
            {/* Заголовок секции — Caption 3 CAPS, обёртка pt16 pb8 px8 (Figma sectionTitle). */}
            <div style={{ padding: '16px 8px 8px' }}>
              <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface)' }}>{g.section}</span>
            </div>
            <div style={{ background: 'var(--color-surface-transparent)', borderRadius: 20, overflow: 'hidden' }}>
              {g.services.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.name)}
                  style={{
                    width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: 'none',
                    padding: '16px 20px', display: 'flex', alignItems: 'center',
                    borderTop: i ? '1px solid var(--color-secondary-surface-muted)' : 'none',
                  }}
                >
                  <span style={{ ...text.body2, color: 'var(--color-on-surface)' }}>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {loaded && groups.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 40, ...text.body, color: 'var(--color-on-surface-secondary)' }}>
            Справочник пока пуст
          </div>
        )}
        {loaded && groups.length > 0 && q && shownGroups.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 40, ...text.body, color: 'var(--color-on-surface-secondary)' }}>
            Ничего не найдено
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// vuesax/linear/search-normal (24×24).
function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11.5 21a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM22 22l-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
