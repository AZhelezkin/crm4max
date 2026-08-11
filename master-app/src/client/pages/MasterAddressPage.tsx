import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { mastersApi, type MasterAddressDetails } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import BottomToast from '@/components/BottomToast'
import { HeroHeader } from '@/components/onboardingShared'
import { parseBookingAddress } from '@/lib/bookingAddress'
import { systemMapsUrl } from '@/lib/maps'
import { text } from '@/styles/typography'

export default function MasterAddressPage() {
  const navigate = useNavigate()
  const masterId = useBookingStore((state) => state.masterId)
  const [details, setDetails] = useState<MasterAddressDetails | null>(null)
  const [menu, setMenu] = useState<{ right: number; top?: number; bottom?: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!masterId) {
      navigate('/', { replace: true })
      return
    }
    let active = true
    void mastersApi.getAddressDetails(masterId)
      .then((value) => { if (active) setDetails(value) })
      .catch(() => { if (active) navigate('/', { replace: true }) })
    return () => { active = false }
  }, [masterId, navigate])

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
  }, [])

  if (!details?.location) return null
  const parsed = parseBookingAddress(details.location, details.locationNote)

  const showCopied = () => {
    setToast('Скопировано')
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2000)
  }

  const copyAddress = async () => {
    setMenu(null)
    try {
      await navigator.clipboard.writeText(parsed.address)
      showCopied()
    } catch {
      setToast('Не удалось скопировать')
    }
  }

  const openMaps = () => {
    setMenu(null)
    const url = systemMapsUrl({ address: parsed.address, lat: details.lat, lng: details.lng })
    if (window.WebApp?.openLink) window.WebApp.openLink(url)
    else window.location.href = url
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Адрес мастера" onBack={() => navigate(-1)} />
      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          type="button"
          aria-label={`Адрес ${parsed.address}`}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const openUp = window.innerHeight - rect.bottom < 140 && rect.top > 140
            setMenu(openUp
              ? { right: 16, bottom: window.innerHeight - rect.top + 8 }
              : { right: 16, top: rect.bottom + 8 })
          }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--color-surface-transparent)', borderRadius: 20,
            padding: '16px 20px', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <LocationIcon />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ ...text.caption, color: 'var(--color-on-surface-secondary)', display: 'block' }}>Адрес</span>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)', display: 'block', overflowWrap: 'anywhere' }}>{parsed.address}</span>
          </span>
          <ChevronDownIcon />
        </button>

        <ReadOnlyField label="Подъезд" value={parsed.entrance} />
        <ReadOnlyField label="Домофон" value={parsed.intercom} />
        <ReadOnlyField label="Этаж" value={parsed.floor} />
        <ReadOnlyField label="Квартира/офис" value={parsed.apartment} />
        <ReadOnlyField label="Комментарий" value={parsed.comment} multiline />
      </div>

      {menu && <AddressMenu pos={menu} onClose={() => setMenu(null)} onCopy={() => { void copyAddress() }} onOpenMaps={openMaps} />}
      <BottomToast message={toast} />
    </div>
  )
}

function ReadOnlyField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div aria-label={label} style={{
      width: '100%', minHeight: 72, boxSizing: 'border-box', borderRadius: 20,
      padding: '15px 20px', display: 'flex', flexDirection: 'column', justifyContent: multiline ? 'flex-start' : 'center',
      background: 'var(--color-surface-transparent)',
    }}>
      <span style={{ ...text.caption, color: 'var(--color-on-surface-secondary)' }}>{label}</span>
      <span style={{ ...(multiline ? text.body2 : text.callout1), color: 'var(--color-on-surface)', whiteSpace: multiline ? 'pre-line' : 'normal', overflowWrap: 'anywhere' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function AddressMenu({ pos, onClose, onCopy, onOpenMaps }: {
  pos: { right: number; top?: number; bottom?: number }
  onClose: () => void
  onCopy: () => void
  onOpenMaps: () => void
}) {
  const items: Array<{ label: string; icon: ReactNode; onClick: () => void }> = [
    { label: 'Скопировать', icon: <CopyIcon />, onClick: onCopy },
    { label: 'Открыть в картах', icon: <LocationIcon />, onClick: onOpenMaps },
  ]
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div onClick={(event) => event.stopPropagation()} style={{
        position: 'fixed', right: pos.right,
        ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
        minWidth: 220, maxWidth: 'calc(100vw - 32px)',
        background: 'var(--color-surface)', borderRadius: 16, padding: '12px 20px',
        boxShadow: '0 16px 16px -4px rgba(12,12,13,0.10), 0 4px 2px -4px rgba(12,12,13,0.05)',
      }}>
        {items.map((item, index) => (
          <div key={item.label}>
            {index > 0 && <div style={{ height: 8, display: 'flex', alignItems: 'center' }}><div style={{ width: '100%', height: 1, background: 'var(--color-divider-low)' }} /></div>}
            <button type="button" onClick={item.onClick} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
              background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--color-on-surface)',
            }}>
              <span style={{ flex: 1, minWidth: 0, ...text.body2 }}>{item.label}</span>
              <span style={{ flexShrink: 0, display: 'inline-flex' }}>{item.icon}</span>
            </button>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}

function LocationIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 13.43a3.12 3.12 0 1 0 0-6.24 3.12 3.12 0 0 0 0 6.24Z" stroke="currentColor" strokeWidth="1.5"/><path d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 0 1-7.21 0c-2.77-2.66-5.93-6.97-4.77-12.05Z" stroke="currentColor" strokeWidth="1.5"/></svg>
}

function CopyIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M16 12.9V17.1C16 20.6 14.6 22 11.1 22H6.9C3.4 22 2 20.6 2 17.1V12.9C2 9.4 3.4 8 6.9 8H11.1C14.6 8 16 9.4 16 12.9Z" stroke="currentColor" strokeWidth="1.5"/><path d="M8 8V6.9C8 3.4 9.4 2 12.9 2H17.1C20.6 2 22 3.4 22 6.9V11.1C22 14.6 20.6 16 17.1 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}

function ChevronDownIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
