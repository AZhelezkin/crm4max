import { useEffect, useState } from 'react'
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

// Запускаем сканер на уровне модуля — синхронно при импорте,
// пока user gesture от нажатия кнопки ещё активен.
// Только в QR-режиме (startParam не UUID и не mmode).
const _sp = window.WebApp?.initDataUnsafe?.start_param ?? ''
const _isQR = _sp !== 'mmode' && !UUID_REGEX.test(_sp)
const scanPromise = _isQR ? (window.WebApp?.openCodeReader?.(true) ?? null) : null

export default function QRScanPage() {
  const navigate = useNavigate()
  const setMasterId = useBookingStore((s) => s.setMasterId)
  const [debug, setDebug] = useState<string>('')

  useEffect(() => {
    if (!scanPromise) { setDebug('no scanPromise'); return }

    scanPromise.then((result) => {
      const masterId = extractMasterId(result)
      setDebug(`masterId=${masterId} raw=${JSON.stringify(result).slice(0, 80)}`)
      if (masterId) {
        setMasterId(masterId)
        navigate(`/?masterId=${masterId}`, { replace: true })
      }
    }).catch((e) => {
      setDebug(`catch: ${String(e)}`)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!debug) return null
  return (
    <div style={{ padding: 20, fontSize: 12, wordBreak: 'break-all', color: '#333', background: '#fff' }}>
      {debug}
    </div>
  )
}
