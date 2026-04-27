import { useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'crm4max-theme'

function readStoredTheme(): ThemeMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/**
 * Хук темы. Применяет data-theme на <html>, сохраняет выбор в localStorage.
 * Стартовое значение синхронизировано с inline-скриптом в index.html (без вспышки).
 */
export function useTheme(): [ThemeMode, () => void] {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* приватный режим */ }
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return [theme, toggle]
}
