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

function readSystemTheme(): ThemeMode {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

/**
 * Хук темы.
 * Приоритет: явный выбор (localStorage) > системная тема Max/OS > Dark.
 * Если пользователь не переключал вручную, тема следует за системой даже после её смены на лету.
 */
export function useTheme(): [ThemeMode, () => void] {
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme() ?? readSystemTheme())

  // Применяем data-theme на <html> при изменении.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Слушаем системную тему — только если пользователь НЕ выбирал явно.
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
