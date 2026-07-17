import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { startSupport } from '@/api/support.api'

// Таб-бар по макету 10220-102508 (плавающая пилюля): Главная / Записи / Доход /
// Поддержка. Активный таб — подсветка-пилюля (secondary-surface-muted) + синий
// (active-element). «Поддержка» — не роут, а запуск режима поддержки в боте.

const ACTIVE = 'var(--color-active-element)'
const INACTIVE = 'var(--color-on-surface-secondary)'

// Figma «Label 2 / tab»: 12 / 14 / 600, letterSpacing 0.06.
const LABEL: React.CSSProperties = { fontSize: 12, lineHeight: '14px', fontWeight: 600, letterSpacing: 0.06, whiteSpace: 'nowrap' }

// vuesax/linear/happyemoji — «Главная».
function HappyIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <path d="M9 22h6c5 0 7-2 7-7V9c0-5-2-7-7-7H9C4 2 2 4 2 9v6c0 5 2 7 7 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 14c.75 1.6 2.28 2.7 4 2.7s3.25-1.1 4-2.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.7" cy="9.5" r="0.9" fill="currentColor" />
      <circle cx="15.3" cy="9.5" r="0.9" fill="currentColor" />
    </svg>
  )
}

// vuesax/linear/calendar-2 — «Записи».
function CalendarIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <path d="M8 2v3M16 2v3M3.5 9.09h17" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      {[[15.7, 13.7], [15.7, 16.7], [12, 13.7], [12, 16.7], [8.29, 13.7], [8.29, 16.7]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.7" fill="currentColor" />
      ))}
    </svg>
  )
}

// vuesax/linear/wallet-3 — «Доход».
function WalletIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color }}>
      <path d="M7 4.5h10c2.5 0 4 1.5 4 4v7c0 2.5-1.5 4-4 4H7c-2.5 0-4-1.5-4-4v-7c0-2.5 1.5-4 4-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 11.2h-3.1c-1.05 0-1.9.85-1.9 1.9s.85 1.9 1.9 1.9H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 8.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.85" cy="13.1" r="0.85" fill="currentColor" />
    </svg>
  )
}

// Поддержка — текущая иконка (vuesax support, filled).
function SupportIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ color }}>
      <path fill="currentColor" d="M14 2.333c-5.798 0-10.5 4.702-10.5 10.5v6.417c0 1.93 1.57 3.5 3.5 3.5h1.167c.644 0 1.166-.523 1.166-1.167v-5.833c0-.644-.522-1.167-1.166-1.167H5.833v-1.75c0-4.51 3.657-8.166 8.167-8.166s8.167 3.656 8.167 8.166v1.75h-2.334c-.644 0-1.166.523-1.166 1.167v5.833c0 .644.522 1.167 1.166 1.167h2.334v.583c0 1.61-1.307 2.917-2.917 2.917H15.75a1.75 1.75 0 0 0-1.75 1.75v.583c0 .322-.261.584-.583.584H11.083a.583.583 0 0 1-.583-.584v-1.166c0-.322.261-.584.583-.584h2.334c.644 0 1.166-.522 1.166-1.166s-.522-1.167-1.166-1.167h-2.334a2.917 2.917 0 0 0-2.916 2.917v1.166a2.917 2.917 0 0 0 2.916 2.917h2.334a2.917 2.917 0 0 0 2.916-2.917v-.583c4.832 0 5.25-3.92 5.25-5.25v-7c0-5.798-4.702-10.5-10.5-10.5Z" />
    </svg>
  )
}

const TABS = [
  { path: '/', label: 'Главная', Icon: HappyIcon },
  { path: '/bookings', label: 'Записи', Icon: CalendarIcon },
  { path: '/income', label: 'Доход', Icon: WalletIcon },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [supportLoading, setSupportLoading] = useState(false)

  const activeTab = TABS.find((t) =>
    t.path === '/' ? location.pathname === '/' : location.pathname.startsWith(t.path)
  )?.path ?? '/'

  // Поддержка: включаем режим на бэке и открываем мастер-бот в Max (как у клиента).
  const handleSupport = async () => {
    if (supportLoading) return
    setSupportLoading(true)
    try {
      const { botUrl } = await startSupport()
      const wa = window.WebApp
      if (wa?.openMaxLink) wa.openMaxLink(botUrl)
      else if (wa?.openLink) wa.openLink(botUrl)
      else window.open(botUrl, '_blank')
    } catch (err) {
      console.error('startSupport failed', err)
      alert('Не удалось открыть поддержку. Попробуйте позже.')
    } finally {
      setSupportLoading(false)
    }
  }

  const tabStyle: React.CSSProperties = {
    position: 'relative', flex: '1 1 0', minWidth: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px 7px',
    WebkitTapHighlightColor: 'transparent',
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', justifyContent: 'center',
      paddingTop: 12, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
      pointerEvents: 'none',
    }}>
      {/* Плавающая пилюля (liquid glass): surface + blur + мягкая тень */}
      <div style={{
        pointerEvents: 'auto',
        display: 'flex', alignItems: 'stretch',
        width: 'calc(100% - 24px)', maxWidth: 360,
        background: 'var(--color-surface)',
        borderRadius: 32,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        padding: 6,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.path
          const color = active ? ACTIVE : INACTIVE
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)} style={tabStyle}>
              {active && (
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 24,
                  background: 'var(--color-secondary-surface-muted)', opacity: 0.85, zIndex: 0,
                }} />
              )}
              <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex' }}>
                <tab.Icon color={color} />
              </span>
              <span style={{ position: 'relative', zIndex: 1, ...LABEL, color }}>{tab.label}</span>
            </button>
          )
        })}
        <button onClick={handleSupport} disabled={supportLoading} style={{ ...tabStyle, opacity: supportLoading ? 0.5 : 1 }}>
          <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex' }}>
            <SupportIcon color={INACTIVE} />
          </span>
          <span style={{ position: 'relative', zIndex: 1, ...LABEL, color: INACTIVE }}>Поддержка</span>
        </button>
      </div>
    </nav>
  )
}
