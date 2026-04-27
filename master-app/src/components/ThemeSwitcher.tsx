import { useRef, useState } from 'react'
import { useTheme, debugThemeSource } from '@/styles/useTheme'

const TAPS_TO_TOGGLE = 7
const TAP_TIMEOUT_MS = 1500

/**
 * Скрытый тумблер темы:
 * — 40×40 невидимая горячая зона в правом верхнем углу;
 * — 7 быстрых тапов (≤1.5 сек между каждым) переключают Dark ⇄ Light;
 * — после переключения короткий toast по центру сверху.
 */
export default function ThemeSwitcher() {
  const [theme, toggle] = useTheme()
  const [toastVisible, setToastVisible] = useState(false)
  const tapsRef = useRef(0)
  const lastTapRef = useRef(0)

  const handleTap = () => {
    const now = Date.now()
    tapsRef.current = now - lastTapRef.current > TAP_TIMEOUT_MS ? 1 : tapsRef.current + 1
    lastTapRef.current = now

    if (tapsRef.current >= TAPS_TO_TOGGLE) {
      tapsRef.current = 0
      toggle()
      setToastVisible(true)
      window.setTimeout(() => setToastVisible(false), 1800)
    }
  }

  return (
    <>
      <div
        onClick={handleTap}
        aria-hidden="true"
        style={{
          position: 'fixed', top: 0, right: 0,
          width: 40, height: 40,
          zIndex: 9999, background: 'transparent',
        }}
      />
      {toastVisible && (
        <div
          role="status"
          style={{
            position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--color-secondary-surface)', color: 'var(--color-on-surface)',
            padding: '10px 18px', borderRadius: 'var(--radius)',
            fontSize: 14, fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            zIndex: 10000, pointerEvents: 'none',
          }}
        >
          Тема: {theme === 'dark' ? 'тёмная' : 'светлая'}
        </div>
      )}
      <ThemeDebugPanel />
    </>
  )
}

function ThemeDebugPanel() {
  const enabled = typeof window !== 'undefined' &&
    (/[?&]themedebug\b/.test(window.location.search) || /\bthemedebug\b/.test(window.location.hash))
  if (!enabled) return null
  const info = debugThemeSource()
  return (
    <div
      style={{
        position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 10001,
        background: 'var(--color-secondary-surface)', color: 'var(--color-on-surface)',
        padding: 12, borderRadius: 'var(--radius)', fontSize: 12, lineHeight: 1.4,
        fontFamily: 'monospace', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>theme debug</div>
      detected: <b>{info.theme}</b> (via {info.source}){'\n'}
      data-theme: {document.documentElement.dataset.theme}{'\n'}
      prefers-light: {String(info.mediaLight)}{'\n'}
      WebApp keys: {info.webAppKeys.join(', ') || '—'}
    </div>
  )
}
