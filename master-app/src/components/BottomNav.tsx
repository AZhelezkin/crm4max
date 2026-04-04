import { useLocation, useNavigate } from 'react-router-dom'
import profileIconUrl from '@/assets/icon-profile.svg'

const TABS = [
  {
    path: '/',
    label: 'Профиль',
    icon: (active: boolean) => (
      <img
        src={profileIconUrl}
        alt="Профиль"
        style={{ width: 24, height: 24, opacity: active ? 1 : 0.45 }}
      />
    ),
  },
  {
    path: '/bookings',
    label: 'Записи',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="17" rx="3" stroke={active ? '#2688EB' : '#8E8E93'} strokeWidth="2" fill="none" />
        <path d="M8 2v4M16 2v4M3 9h18" stroke={active ? '#2688EB' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" />
        <rect x="7" y="13" width="3" height="3" rx="1" fill={active ? '#2688EB' : '#8E8E93'} />
        <rect x="14" y="13" width="3" height="3" rx="1" fill={active ? '#2688EB' : '#8E8E93'} />
      </svg>
    ),
  },
  {
    path: '/clients',
    label: 'Клиенты',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          fill={active ? '#2688EB' : 'none'}
          stroke={active ? '#2688EB' : '#8E8E93'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    path: '/income',
    label: 'Доход',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="20" height="14" rx="2" stroke={active ? '#2688EB' : '#8E8E93'} strokeWidth="2" fill="none" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke={active ? '#2688EB' : '#8E8E93'} strokeWidth="2" />
        <circle cx="12" cy="14" r="2" fill={active ? '#2688EB' : '#8E8E93'} />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = TABS.find((t) =>
    t.path === '/' ? location.pathname === '/' : location.pathname.startsWith(t.path)
  )?.path ?? '/'

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      background: 'var(--color-card)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map((tab) => {
        const active = activeTab === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
            }}
          >
            {tab.icon(active)}
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              color: active ? '#2688EB' : '#8E8E93',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
