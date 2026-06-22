import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { text } from '@/styles/typography'
import { startSupport } from '@client/api/support.api'
import { useBookingStore } from '@client/store/booking.store'

function IconCatalog({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary-surface)' : 'var(--color-on-surface-secondary)'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M21 2.333H7C5.063 2.333 3.5 3.885 3.5 5.798v12.729C3.5 20.44 5.063 22.003 7 22.003h.887c.921 0 1.82.362 2.473 1.015l1.995 1.972c.91.898 2.38.898 3.29 0l1.995-1.972c.653-.653 1.552-1.015 2.473-1.015H21c1.937 0 3.5-1.563 3.5-3.477V5.798C24.5 3.885 22.937 2.333 21 2.333ZM14 6.475c1.26 0 2.275 1.027 2.275 2.275 0 1.237-.98 2.228-2.193 2.275-.046 0-.116 0-.175 0-1.225-.047-2.193-1.038-2.193-2.275C11.725 7.502 12.74 6.475 14 6.475Zm3.208 10.663c-1.761 1.179-4.655 1.179-6.416 0-1.552-1.027-1.552-2.73 0-3.769 1.773-1.178 4.667-1.178 6.416 0 1.552 1.039 1.552 2.73 0 3.769Z" fill={c}/>
    </svg>
  )
}

function IconCalendar({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary-surface)' : 'var(--color-on-surface-secondary)'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M9.333 2.333v2.334M18.667 2.333v2.334" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M3.5 10.5h21" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M18.667 3.5H9.333C5.633 3.5 3.5 5.367 3.5 9.15v9.717C3.5 22.7 5.633 24.5 9.333 24.5h9.334C22.4 24.5 24.5 22.633 24.5 18.85V9.15C24.5 5.367 22.4 3.5 18.667 3.5Z" fill={c} opacity="0.4"/>
      <path d="M13.994 15.983a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333ZM9.578 15.983a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333ZM18.41 15.983a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333ZM13.994 19.833a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333ZM9.578 19.833a1.167 1.167 0 1 0 0-2.333 1.167 1.167 0 0 0 0 2.333Z" fill={c}/>
    </svg>
  )
}

function IconMessages({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary-surface)' : 'var(--color-on-surface-secondary)'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M19.833 2.333H8.166C4.946 2.333 2.333 4.935 2.333 8.143v6.977 1.167c0 3.208 2.613 5.81 5.833 5.81h1.75c.315 0 .735.21.933.467l1.75 2.322c.77 1.026 2.03 1.026 2.8 0l1.75-2.322c.222-.292.571-.467.933-.467h1.75c3.22 0 5.834-2.602 5.834-5.81V8.143c0-3.208-2.614-5.81-5.834-5.81ZM15.166 16.042H8.166a.877.877 0 0 1-.875-.876c0-.478.397-.875.875-.875h7c.478 0 .875.397.875.875a.877.877 0 0 1-.875.876Zm4.667-5.834H8.166a.877.877 0 0 1-.875-.875c0-.478.397-.875.875-.875h11.667c.478 0 .875.397.875.875a.877.877 0 0 1-.875.875Z" fill={c}/>
    </svg>
  )
}

function IconSupport({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary-surface)' : 'var(--color-on-surface-secondary)'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 2.333c-5.798 0-10.5 4.702-10.5 10.5v6.417c0 1.93 1.57 3.5 3.5 3.5h1.167c.644 0 1.166-.523 1.166-1.167v-5.833c0-.644-.522-1.167-1.166-1.167H5.833v-1.75c0-4.51 3.657-8.166 8.167-8.166s8.167 3.656 8.167 8.166v1.75h-2.334c-.644 0-1.166.523-1.166 1.167v5.833c0 .644.522 1.167 1.166 1.167h2.334v.583c0 1.61-1.307 2.917-2.917 2.917H15.75a1.75 1.75 0 0 0-1.75 1.75v.583c0 .322-.261.584-.583.584H11.083a.583.583 0 0 1-.583-.584v-1.166c0-.322.261-.584.583-.584h2.334c.644 0 1.166-.522 1.166-1.166s-.522-1.167-1.166-1.167h-2.334a2.917 2.917 0 0 0-2.916 2.917v1.166a2.917 2.917 0 0 0 2.916 2.917h2.334a2.917 2.917 0 0 0 2.916-2.917v-.583c4.832 0 5.25-3.92 5.25-5.25v-7c0-5.798-4.702-10.5-10.5-10.5Z" fill={c}/>
    </svg>
  )
}

const NAV_ITEMS = [
  { key: 'catalog', label: 'Профиль', path: '/', Icon: IconCatalog },
  { key: 'bookings', label: 'Записи', path: '/my-bookings', Icon: IconCalendar },
  { key: 'messages', label: 'Сообщения', path: '/messages', Icon: IconMessages },
] as const

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [supportLoading, setSupportLoading] = useState(false)
  // «Сообщения» доступны только если мастер оставил ссылку на профиль в MAX.
  const masterProfileLink = useBookingStore((s) => s.masterProfileLink)
  const navItems = NAV_ITEMS.filter((i) => i.key !== 'messages' || !!masterProfileLink)

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

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

  const buttonStyle = {
    flex: 1, display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 4, padding: '10px 0 12px', background: 'none',
    border: 'none', cursor: 'pointer',
  }
  const labelStyle = (active: boolean) => ({
    ...text.caption,
    color: active ? 'var(--color-primary-surface)' : 'var(--color-on-surface-secondary)',
  })

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--color-background)',
      borderTop: '1px solid var(--color-divider-low)',
      display: 'flex',
      zIndex: 50,
      paddingBottom: 19,
    }}>
      {navItems.map(({ key, label, path, Icon }) => {
        const active = isActive(path)
        return (
          <button key={key} onClick={() => navigate(path)} style={buttonStyle}>
            <Icon active={active} />
            <span style={labelStyle(active)}>{label}</span>
          </button>
        )
      })}
      <button
        key="support"
        onClick={handleSupport}
        disabled={supportLoading}
        style={{ ...buttonStyle, opacity: supportLoading ? 0.5 : 1 }}
      >
        <IconSupport active={false} />
        <span style={labelStyle(false)}>Поддержка</span>
      </button>
    </nav>
  )
}
