import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '@client/store/booking.store'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function extractMasterId(scanned: string): string | null {
  try {
    const url = new URL(scanned)
    // формат бота: ?startapp=<UUID>
    const startapp = url.searchParams.get('startapp')
    if (startapp && UUID_REGEX.test(startapp)) return startapp
    // формат GitHub Pages: ?masterId=<UUID>
    const masterId = url.searchParams.get('masterId')
    if (masterId && UUID_REGEX.test(masterId)) return masterId
    // формат хэша: #/?masterId=<UUID>
    const hashSearch = url.hash.split('?')[1] ?? ''
    const hashMasterId = new URLSearchParams(hashSearch).get('masterId')
    if (hashMasterId && UUID_REGEX.test(hashMasterId)) return hashMasterId
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
        navigate(`/?masterId=${masterId}`, { replace: true })
      }
    }).catch(() => {
      // пользователь закрыл сканер — возвращаемся назад
      navigate(-1)
    })
  }, [navigate, setMasterId])

  return null
}
