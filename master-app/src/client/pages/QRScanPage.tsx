import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '@client/store/booking.store'
import { text } from '@/styles/typography'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ScanResult = string | { data?: string; result?: string; text?: string }

function extractMasterId(raw: ScanResult): string | null {
  const scanned = typeof raw === 'string' ? raw : (raw.data ?? raw.result ?? raw.text ?? JSON.stringify(raw))

  try {
    const url = new URL(scanned)
    const startapp = url.searchParams.get('startapp')
    if (startapp && UUID_REGEX.test(startapp)) return startapp
  } catch {
    if (UUID_REGEX.test(scanned)) return scanned
  }

  const match = scanned.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  if (match) return match[0]

  return null
}

export default function QRScanPage() {
  const navigate = useNavigate()
  const setMasterId = useBookingStore((s) => s.setMasterId)
  const [scanning, setScanning] = useState(false)

  const handleScan = () => {
    if (!window.WebApp?.openCodeReader || scanning) return
    setScanning(true)
    window.WebApp.openCodeReader(true).then((result) => {
      const masterId = extractMasterId(result)
      if (masterId) {
        setMasterId(masterId)
        navigate(`/?masterId=${masterId}`, { replace: true })
      } else {
        setScanning(false)
      }
    }).catch(() => {
      setScanning(false)
    })
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100dvh', gap: 16,
      background: 'var(--color-background)', color: 'var(--color-on-surface)',
      padding: '0 24px', textAlign: 'center',
    }}>
      <h2 style={{ margin: 0, ...text.titleSmall }}>Сканировать QR-код</h2>
      <p style={{ margin: 0, color: 'var(--color-on-surface-secondary)', ...text.action }}>
        Для записи к конкреному мастеру попросите его показать или переслать вам QR-код.</p>
      <button
        onClick={handleScan}
        disabled={scanning}
        style={{
          marginTop: 8,
          background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)',
          border: 'none', borderRadius: 12, padding: '14px 40px',
          ...text.subhead,
          cursor: scanning ? 'default' : 'pointer',
          opacity: scanning ? 0.7 : 1,
        }}
      >
        {scanning ? 'Открываю камеру…' : 'Сканировать'}
      </button>
    </div>
  )
}
