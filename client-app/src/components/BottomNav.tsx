import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  {
    key: 'catalog',
    label: 'Каталог',
    path: '/',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" fill={active ? '#2688EB' : '#8E8E93'} />
        <rect x="13" y="3" width="8" height="8" rx="2" fill={active ? '#2688EB' : '#8E8E93'} />
        <rect x="3" y="13" width="8" height="8" rx="2" fill={active ? '#2688EB' : '#8E8E93'} />
        <rect x="13" y="13" width="8" height="8" rx="2" fill={active ? '#2688EB' : '#8E8E93'} />
      </svg>
    ),
  },
  {
    key: 'bookings',
    label: 'Записи',
    path: '/my-bookings',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="17" rx="3" stroke={active ? '#2688EB' : '#8E8E93'} strokeWidth="2" />
        <path d="M3 9h18" stroke={active ? '#2688EB' : '#8E8E93'} strokeWidth="2" />
        <path d="M8 2v4M16 2v4" stroke={active ? '#2688EB' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" />
        <circle cx="8" cy="14" r="1.5" fill={active ? '#2688EB' : '#8E8E93'} />
        <circle cx="12" cy="14" r="1.5" fill={active ? '#2688EB' : '#8E8E93'} />
        <circle cx="16" cy="14" r="1.5" fill={active ? '#2688EB' : '#8E8E93'} />
      </svg>
    ),
  },
  {
    key: 'messages',
    label: 'Сообщения',
    path: '/messages',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-4 4V6a2 2 0 0 1 2-2z"
          stroke={active ? '#2688EB' : '#8E8E93'}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: 'contacts',
    label: 'Контакты',
    path: '/contacts',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={active ? '#2688EB' : '#8E8E93'} strokeWidth="2" />
        <path
          d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
          stroke={active ? '#2688EB' : '#8E8E93'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

interface Props {
  badge?: Partial<Record<string, number>>
}

export default function BottomNav({ badge = {} }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#1C1C1E',
      borderTop: '1px solid #2C2C2E',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 50,
    }}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.path)
        const count = badge[item.key] ?? 0
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: '10px 0', background: 'none',
              color: active ? '#2688EB' : '#8E8E93',
            }}
          >
            <div style={{ position: 'relative' }}>
              {item.icon(active)}
              {count > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: '#FF3B30', borderRadius: '50%',
                  minWidth: 16, height: 16, fontSize: 10, fontWeight: 700,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>
                  {count}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
