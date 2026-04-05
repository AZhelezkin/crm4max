import { useEffect, useState } from 'react'
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
  const [debugInfo, setDebugInfo] = useState<string>('waiting...')

  useEffect(() => {
    if (!window.WebApp?.openCodeReader) {
      setDebugInfo('openCodeReader not available')
      return
    }

    setDebugInfo('calling openCodeReader...')

    window.WebApp.openCodeReader(true).then((result) => {
      setDebugInfo(`resolved: ${result}`)
      const masterId = extractMasterId(result)
      if (masterId) {
        setMasterId(masterId)
        navigate(`/?masterId=${masterId}`, { replace: true })
      } else {
        setDebugInfo(`no masterId in: ${result}`)
      }
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err)
      setDebugInfo(`rejected: ${msg}`)
    })
  }, [navigate, setMasterId])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      height: '100dvh', padding: 16, gap: 12, background: 'var(--color-bg)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', wordBreak: 'break-all' }}>
        {debugInfo}
      </div>
      <button
        onClick={() => navigate('/', { replace: true })}
        style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--color-card)', cursor: 'pointer' }}
      >
        Назад
      </button>
    </div>
  )
}
