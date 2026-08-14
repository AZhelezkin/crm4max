import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'
import { HeroHeader } from '@/components/onboardingShared'
import { startSupport } from '@/api/support.api'
import { createMessengerProfileLink } from '@/api/messenger-profile-links.api'
import { miniAppProvider, openMiniAppMessengerLink } from '@/lib/miniAppHost'
import { renderMiniAppDestination } from '@/lib/miniAppDestinations'

// Экран «Другое» (макеты 10302-42755, 10338-42120) — вкладка навбара: тулбар без
// кнопки «назад» (leading-слот пуст), снизу виден навбар с активной вкладкой.
// Пункты-меню ведут на самостоятельные экраны; техподдержка запускает режим
// поддержки в мастер-боте.
export default function OtherPage() {
  const navigate = useNavigate()
  const [supportLoading, setSupportLoading] = useState(false)
  const [profileLinkLoading, setProfileLinkLoading] = useState(false)

  // Поддержка: включаем режим на бэке и открываем мастер-бот в Max (как было в навбаре).
  const openSupport = async () => {
    if (supportLoading) return
    setSupportLoading(true)
    try {
      const { botUrl } = await startSupport()
      const destination = renderMiniAppDestination(miniAppProvider(), { kind: 'support', url: botUrl })
      if (destination.status !== 'available') throw new Error('Support destination unavailable')
      openMiniAppMessengerLink(destination.url)
    } catch (err) {
      console.error('startSupport failed', err)
      alert('Не удалось открыть поддержку. Попробуйте позже.')
    } finally {
      setSupportLoading(false)
    }
  }

  const linkProfiles = async () => {
    if (profileLinkLoading) return
    setProfileLinkLoading(true)
    try {
      const { url } = await createMessengerProfileLink()
      openMiniAppMessengerLink(url)
    } catch (err) {
      console.error('createMessengerProfileLink failed', err)
      alert('Не удалось связать профили. Попробуйте позже.')
    } finally {
      setProfileLinkLoading(false)
    }
  }

  const items: Array<{ label: string; onClick?: () => void; loading?: boolean }> = [
    { label: 'Согласия', onClick: () => navigate('/consents') },
    { label: 'Подписка', onClick: () => navigate('/subscription') },
    { label: 'Способы оплаты', onClick: () => navigate('/payment-methods') },
    { label: 'Связать профили', onClick: linkProfiles, loading: profileLinkLoading },
    { label: 'Техническая поддержка', onClick: openSupport, loading: supportLoading },
    { label: 'О платформе', onClick: () => navigate('/about-platform') },
  ]

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: 95 }}>
      <HeroHeader title="Другое" />

      <div style={{ padding: '0 16px 8px' }}>
        <div style={{
          background: 'var(--color-surface-transparent)', borderRadius: 24, cornerShape: 'squircle',
          boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.1)', overflow: 'hidden',
        }}>
          {items.map((it, i) => {
            const disabled = !it.onClick
            const last = i === items.length - 1
            return (
              <button
                key={it.label}
                type="button"
                disabled={disabled || !!it.loading}
                onClick={it.onClick}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  cursor: disabled ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                  padding: 16,
                  borderBottom: last ? 'none' : '1px solid var(--color-secondary-surface-muted)',
                  opacity: disabled ? 0.4 : it.loading ? 0.6 : 1,
                }}
              >
                <span style={{ ...text.body2, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.label}
                </span>
                <span style={{ flexShrink: 0, display: 'inline-flex', color: disabled ? 'var(--color-interactive-element-muted)' : 'var(--color-interactive-element-secondary)' }}>
                  <ArrowRightIcon />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// vuesax/linear/arrow-right (16×16).
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5.94 3.29 10.65 8l-4.71 4.71" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
