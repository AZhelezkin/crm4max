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

function dumpWebApp(): string {
  const w = (window as any).WebApp
  if (!w) return '— no window.WebApp —'
  const out: string[] = []
  for (const k of Object.keys(w)) {
    let val: string
    try {
      const v = w[k]
      if (v == null) val = String(v)
      else if (typeof v === 'function') val = '[fn]'
      else if (typeof v === 'object') {
        const keys = Object.keys(v)
        const previews: string[] = []
        for (const sk of keys.slice(0, 10)) {
          try {
            const sv = v[sk]
            const s = sv == null ? String(sv)
              : typeof sv === 'function' ? '[fn]'
              : typeof sv === 'object' ? `{${Object.keys(sv).slice(0, 5).join(',')}}`
              : JSON.stringify(sv).slice(0, 50)
            previews.push(`${sk}=${s}`)
          } catch { previews.push(`${sk}=<err>`) }
        }
        val = `{${previews.join(', ')}${keys.length > 10 ? ', …' : ''}}`
      } else val = JSON.stringify(v).slice(0, 80)
    } catch { val = '<err>' }
    out.push(`  ${k}: ${val}`)
  }
  return out.join('\n')
}

function ThemeDebugPanel() {
  const enabled = typeof window !== 'undefined' &&
    (/[?&]themedebug\b/.test(window.location.search) || /\bthemedebug\b/.test(window.location.hash))
  if (!enabled) return null
  const info = debugThemeSource()
  const html = document.documentElement
  const htmlAttrs = Array.from(html.attributes).map((a) => `${a.name}="${a.value}"`).join(' ')
  const bodyBg = window.getComputedStyle(document.body).backgroundColor
  const metaScheme = (document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null)?.content ?? '—'
  return (
    <div
      style={{
        position: 'fixed', top: 56, left: 8, right: 8, bottom: 8, zIndex: 10001,
        background: 'var(--color-secondary-surface)', color: 'var(--color-on-surface)',
        padding: 10, borderRadius: 'var(--radius)', fontSize: 11, lineHeight: 1.35,
        fontFamily: 'monospace', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        overflow: 'auto',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>theme debug</div>
      detected: <b>{info.theme}</b> (via {info.source}){'\n'}
      data-theme: {html.dataset.theme}{'\n'}
      prefers-light: {String(info.mediaLight)}{'\n'}
      meta color-scheme: {metaScheme}{'\n'}
      body background: {bodyBg}{'\n'}
      &lt;html&gt; attrs: {htmlAttrs}{'\n\n'}
      WebApp keys ({info.webAppKeys.length}):{'\n'}
      {dumpWebApp()}
    </div>
  )
}
