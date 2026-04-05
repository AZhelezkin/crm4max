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

    console.log('[QRScan] openCodeReader available, calling...')

    // fileSelect: true — камера + выбор из галереи
    window.WebApp.openCodeReader(true).then((result) => {
      console.log('[QRScan] resolved:', result)
      const masterId = extractMasterId(result)
      console.log('[QRScan] masterId extracted:', masterId)
      if (masterId) {
        setMasterId(masterId)
        navigate(`/?masterId=${masterId}`, { replace: true })
      } else {
        // QR отсканирован, но это не ссылка мастера (например, бот-URL перехвачен Max)
        navigate('/', { replace: true })
      }
    }).catch((err) => {
      console.log('[QRScan] rejected:', err)
      // пользователь закрыл сканер без результата
      navigate('/', { replace: true })
    })
  }, [navigate, setMasterId])

  return null
}
