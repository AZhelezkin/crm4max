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
 * Приоритет: явный выбор пользователя (7-tap → localStorage) > системная тема OS > Dark.
 * Max-клиент тему через Bridge не пробрасывает (проверено через debug-overlay),
 * поэтому полагаемся только на OS через prefers-color-scheme.
 * Если пользователь не делал ручной выбор — реагируем на смену OS-темы на лету.
 */
export function useTheme(): [ThemeMode, () => void] {
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme() ?? readSystemTheme())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

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
