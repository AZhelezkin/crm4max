import { useNavigate, useLocation } from 'react-router-dom'

// Иконки в стиле vuesax/bold (как в Figma)
function IconCatalog({ active }: { active: boolean }) {
  const c = active ? '#007AFE' : '#7D7D7F'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M12.25 3.5H7C5.067 3.5 3.5 5.067 3.5 7v5.25c0 1.933 1.567 3.5 3.5 3.5h5.25c1.933 0 3.5-1.567 3.5-3.5V7c0-1.933-1.567-3.5-3.5-3.5Z" fill={c}/>
      <path d="M21 3.5h-5.25c-1.933 0-3.5 1.567-3.5 3.5v5.25c0 1.933 1.567 3.5 3.5 3.5H21c1.933 0 3.5-1.567 3.5-3.5V7c0-1.933-1.567-3.5-3.5-3.5Z" fill={c} opacity="0.4"/>
      <path d="M12.25 12.25H7c-1.933 0-3.5 1.567-3.5 3.5V21c0 1.933 1.567 3.5 3.5 3.5h5.25c1.933 0 3.5-1.567 3.5-3.5v-5.25c0-1.933-1.567-3.5-3.5-3.5Z" fill={c} opacity="0.4"/>
      <path d="M21 12.25h-5.25c-1.933 0-3.5 1.567-3.5 3.5V21c0 1.933 1.567 3.5 3.5 3.5H21c1.933 0 3.5-1.567 3.5-3.5v-5.25c0-1.933-1.567-3.5-3.5-3.5Z" fill={c}/>
    </svg>
  )
}

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

function IconMessage({ active }: { active: boolean }) {
  const c = active ? '#007AFE' : '#7D7D7F'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M19.833 3.5H8.167C5.133 3.5 3.5 5.133 3.5 8.167v7c0 3.033 1.633 4.666 4.667 4.666h1.166c.234 0 .538.151.688.35l1.167 1.55c.514.688 1.353.688 1.867 0l1.167-1.55c.163-.21.455-.35.688-.35h1.167c3.033 0 4.666-1.633 4.666-4.666v-7C24.5 5.133 22.867 3.5 19.833 3.5Z" fill={c} opacity="0.4"/>
      <path d="M9.333 12.833h9.334M9.333 9.333h5.834" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function IconLocation({ active }: { active: boolean }) {
  const c = active ? '#007AFE' : '#7D7D7F'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M14 2.333C9.993 2.333 6.75 5.577 6.75 9.583c0 5.634 6.417 14.536 6.694 14.921a.694.694 0 0 0 1.112 0c.277-.385 6.694-9.287 6.694-14.921C21.25 5.577 18.007 2.333 14 2.333Z" fill={c} opacity="0.4"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M14 12.25a2.917 2.917 0 1 0 0-5.833 2.917 2.917 0 0 0 0 5.833Z" fill={c}/>
    </svg>
  )
}

const NAV_ITEMS = [
  { key: 'catalog',  label: 'Каталог',    path: '/',           Icon: IconCatalog  },
  { key: 'bookings', label: 'Записи',      path: '/my-bookings', Icon: IconCalendar },
  { key: 'messages', label: 'Сообщения',   path: '/messages',   Icon: IconMessage  },
  { key: 'contacts', label: 'Контакты',    path: '/contacts',   Icon: IconLocation },
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
