import { useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'crm4max-theme'

function readStoredTheme(): ThemeMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function isLightHex(hex: string): boolean {
  // YIQ luminance > 0.5 → светлый цвет
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5
}

/**
 * Определяет тему Max-клиента. Документация Max Bridge о теме молчит,
 * поэтому пробуем все вероятные пути в порядке надёжности:
 *   1. window.WebApp.colorScheme  (Telegram-style)
 *   2. window.WebApp.theme / .colorTheme  (Max-style, если появится)
 *   3. window.WebApp.themeParams.bg_color  → яркость → тема
 *   4. prefers-color-scheme media query (системная тема WebView)
 *   5. Dark по умолчанию
 */
function detectMaxTheme(): { theme: ThemeMode; source: string } {
  const w = (typeof window !== 'undefined' ? (window as any).WebApp : undefined)

  if (w?.colorScheme === 'light' || w?.colorScheme === 'dark')
    return { theme: w.colorScheme, source: 'WebApp.colorScheme' }

  if (w?.theme === 'light' || w?.theme === 'dark')
    return { theme: w.theme, source: 'WebApp.theme' }

  if (w?.colorTheme === 'light' || w?.colorTheme === 'dark')
    return { theme: w.colorTheme, source: 'WebApp.colorTheme' }

  const tp = w?.themeParams
  const bg: unknown = tp?.bg_color ?? tp?.background_color
  if (typeof bg === 'string' && bg.startsWith('#')) {
    return { theme: isLightHex(bg) ? 'light' : 'dark', source: `themeParams.bg_color=${bg}` }
  }

  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches)
    return { theme: 'light', source: 'prefers-color-scheme' }

  return { theme: 'dark', source: 'fallback' }
}

export function debugThemeSource(): { theme: ThemeMode; source: string; webAppKeys: string[]; mediaLight: boolean } {
  const w = (typeof window !== 'undefined' ? (window as any).WebApp : undefined)
  const { theme, source } = detectMaxTheme()
  return {
    theme,
    source,
    webAppKeys: w ? Object.keys(w) : [],
    mediaLight: typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false),
  }
}

/**
 * Хук темы. Приоритет: явный выбор (localStorage) > Max/OS > Dark.
 */
export function useTheme(): [ThemeMode, () => void] {
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme() ?? detectMaxTheme().theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Реакция на смену системной темы (только если пользователь не выбирал явно).
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    if (!mq) return
    const handler = (e: MediaQueryListEvent) => {
      if (readStoredTheme() === null) setTheme(e.matches ? 'light' : 'dark')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggle = () => {
    setTheme((t) => {
      const next: ThemeMode = t === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* приватный режим */ }
      return next
    })
  }

  return [theme, toggle]
}
