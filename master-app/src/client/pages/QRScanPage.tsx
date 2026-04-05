import { useEffect } from 'react'
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

  useEffect(() => {
    if (!window.WebApp?.openCodeReader) return

    // fileSelect: true — камера + выбор из галереи
    window.WebApp.openCodeReader(true).then((result) => {
      const masterId = extractMasterId(result)
      if (masterId) {
        setMasterId(masterId)
        navigate('/', { replace: true })
      }
    }).catch(() => {
      // пользователь закрыл сканер — возвращаемся назад
      navigate(-1)
    })
  }, [navigate, setMasterId])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100dvh', gap: 16,
      background: 'var(--color-bg)', color: 'var(--color-text)',
      padding: '0 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 64 }}>📷</div>
      <h2 style={{ margin: 0, fontSize: 20 }}>Сканировать QR-код</h2>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 14 }}>
        Попросите мастера показать QR-код и направьте камеру на него
      </p>
    </div>
  )
}
