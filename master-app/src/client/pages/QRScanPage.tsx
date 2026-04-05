import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '@client/store/booking.store'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ScanResult = string | { data?: string; result?: string; text?: string }

function extractMasterId(raw: ScanResult): string | null {
  const scanned = typeof raw === 'string' ? raw : (raw.data ?? raw.result ?? raw.text ?? JSON.stringify(raw))

  try {
    const url = new URL(scanned)
    const startapp = url.searchParams.get('startapp')
    if (startapp && UUID_REGEX.test(startapp)) return startapp
  } catch { /* не URL */ }

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
    <div
      onClick={handleScan}
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100dvh', gap: 16,
        background: 'var(--color-bg)',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 56 }}>📷</div>
      <div style={{ fontSize: 17, fontWeight: 600 }}>
        {scanning ? 'Открываю камеру…' : 'Нажмите для сканирования'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0 32px' }}>
        Отсканируйте QR-код мастера, чтобы записаться
      </div>
    </div>
  )
}
