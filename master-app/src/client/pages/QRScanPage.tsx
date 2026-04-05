import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '@client/store/booking.store'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function extractMasterId(scanned: string): string | null {
  try {
    const url = new URL(scanned)
    const startapp = url.searchParams.get('startapp')
    if (startapp && UUID_REGEX.test(startapp)) return startapp
  } catch {
    if (UUID_REGEX.test(scanned)) return scanned
  }
  return null
}

export default function QRScanPage() {
  const navigate = useNavigate()
  const setMasterId = useBookingStore((s) => s.setMasterId)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScan = () => {
    if (!window.WebApp?.openCodeReader) {
      setError('openCodeReader недоступен')
      return
    }
    setScanning(true)
    setError(null)
    window.WebApp.openCodeReader(true).then((result) => {
      setScanning(false)
      const masterId = extractMasterId(result)
      if (masterId) {
        setMasterId(masterId)
        navigate(`/?masterId=${masterId}`, { replace: true })
      } else {
        setError(`Не удалось определить мастера.\nРезультат: ${result}`)
      }
    }).catch((err) => {
      setScanning(false)
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Ошибка: ${msg}`)
    })
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', padding: 24, gap: 20, background: 'var(--color-bg)',
    }}>
      <div style={{ fontSize: 40 }}>📷</div>
      <div style={{ fontSize: 17, fontWeight: 600 }}>Сканировать QR-код</div>
      <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        Отсканируйте QR-код мастера, чтобы записаться
      </div>

      {error && (
        <div style={{
          fontSize: 13, color: '#e53935', background: '#fff0f0',
          borderRadius: 8, padding: '10px 14px', textAlign: 'center',
          wordBreak: 'break-all', maxWidth: 320,
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleScan}
        disabled={scanning}
        style={{
          background: 'var(--color-primary)', color: '#fff',
          border: 'none', borderRadius: 12, padding: '14px 32px',
          fontSize: 16, fontWeight: 600, cursor: scanning ? 'default' : 'pointer',
          opacity: scanning ? 0.7 : 1,
        }}
      >
        {scanning ? 'Открываю камеру…' : 'Открыть камеру'}
      </button>
    </div>
  )
}
