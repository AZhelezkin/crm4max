import { useNavigate, useLocation } from 'react-router-dom'

function IconCalendar({ active }: { active: boolean }) {
  const c = active ? '#007AFE' : '#7D7D7F'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M9.333 2.333v2.334M18.667 2.333v2.334" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M3.5 10.5h21" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M18.667 3.5H9.333C5.633 3.5 3.5 5.367 3.5 9.15v9.717C3.5 22.7 5.633 24.5 9.333 24.5h9.334C22.4 24.5 24.5 22.633 24.5 18.85V9.15C24.5 5.367 22.4 3.5 18.667 3.5Z" fill={c} opacity="0.4"/>
      <path d="M13.994 15.983a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333ZM9.578 15.983a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333ZM18.41 15.983a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333ZM13.994 19.833a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333ZM9.578 19.833a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333Z" fill={c}/>
    </svg>
  )
}

const NAV_ITEMS = [
  { key: 'bookings', label: 'Мои записи', path: '/my-bookings', Icon: IconCalendar },
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
      background: 'var(--color-bg)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 50,
    }}>
      {NAV_ITEMS.map(({ key, label, path, Icon }) => {
        const active = isActive(path)
        const count = badge[key] ?? 0
        return (
          <button
            key={key}
            onClick={() => navigate(path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: '10px 0 12px', background: 'none',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon active={active} />
              {count > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: 'var(--color-danger)', borderRadius: '50%',
                  minWidth: 12, height: 12, fontSize: 9, fontWeight: 700,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 2px',
                }}>
                  {count}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: active ? '#007AFE' : '#7D7D7F',
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
