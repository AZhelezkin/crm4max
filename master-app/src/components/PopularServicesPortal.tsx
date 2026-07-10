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

  useEffect(() => {
    if (!visible) return
    servicesApi.getPopular()
      .then((g) => { setGroups(g); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [visible])

  if (!visible) return null

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--gradient-hero-background)',
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      zIndex: 210,
      display: 'flex', flexDirection: 'column',
    }}>
      <HeroHeader title="Популярные услуги" onBack={onClose} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px calc(48px + env(safe-area-inset-bottom))' }}>
        {groups.map((g) => (
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
      </div>
    </div>,
    document.body,
  )
}
