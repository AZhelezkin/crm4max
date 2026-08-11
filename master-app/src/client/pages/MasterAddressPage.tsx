import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mastersApi, type MasterAddressDetails } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import BottomToast from '@/components/BottomToast'
import { HeroHeader } from '@/components/onboardingShared'
import { parseBookingAddress } from '@/lib/bookingAddress'
import { systemMapsUrl } from '@/lib/maps'
import { text } from '@/styles/typography'
import AddressActionsMenu, { addressMenuPosition, type AddressMenuPosition } from '@/components/AddressActionsMenu'

export default function MasterAddressPage() {
  const navigate = useNavigate()
  const masterId = useBookingStore((state) => state.masterId)
  const [details, setDetails] = useState<MasterAddressDetails | null>(null)
  const [menu, setMenu] = useState<AddressMenuPosition | null>(null)
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
      await navigator.clipboard.writeText([parsed.address, details.locationNote].filter(Boolean).join('\n'))
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
          onClick={(event) => setMenu(addressMenuPosition(event.currentTarget))}
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

      {menu && <AddressActionsMenu position={menu} onClose={() => setMenu(null)} onCopy={() => { void copyAddress() }} onOpenMaps={openMaps} />}
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

function LocationIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 13.43a3.12 3.12 0 1 0 0-6.24 3.12 3.12 0 0 0 0 6.24Z" stroke="currentColor" strokeWidth="1.5"/><path d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 0 1-7.21 0c-2.77-2.66-5.93-6.97-4.77-12.05Z" stroke="currentColor" strokeWidth="1.5"/></svg>
}

function ChevronDownIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
