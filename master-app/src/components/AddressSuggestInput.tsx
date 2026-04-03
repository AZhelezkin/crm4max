import { useEffect, useRef, useState } from 'react'

const SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest'
const API_KEY = import.meta.env.VITE_YANDEX_SUGGEST_KEY as string

interface Suggestion {
  title: string
  subtitle: string
}

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function AddressSuggestInput({ value, onChange }: Props) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync external value changes (e.g. reset)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const text = inputValue.trim()
    if (!text || !API_KEY) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          apikey: API_KEY,
          text,
          lang: 'ru',
          results: '5',
          types: 'house,street',
          print_address: '1',
        })
        const res = await fetch(`${SUGGEST_URL}?${params}`)
        if (!res.ok) return
        const data = await res.json()
        const items: Suggestion[] = (data.results ?? []).map((r: any) => ({
          title: r.title?.text ?? '',
          subtitle: r.subtitle?.text ?? '',
        }))
        setSuggestions(items)
        setOpen(items.length > 0)
      } catch {
        // сетевые ошибки игнорируем
      }
    }, 300)
  }, [inputValue])

  // Закрыть дропдаун по клику вне компонента
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (s: Suggestion) => {
    const full = s.subtitle ? `${s.title}, ${s.subtitle}` : s.title
    setInputValue(full)
    onChange(full)
    setSuggestions([])
    setOpen(false)
  }

  const handleChange = (v: string) => {
    setInputValue(v)
    // Сбрасываем внешнее значение пока пользователь печатает
    if (v !== value) onChange(v)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{
        background: 'var(--color-card)',
        borderRadius: open && suggestions.length > 0 ? 'var(--radius) var(--radius) 0 0' : 'var(--radius)',
        overflow: 'hidden',
        border: open ? '1px solid var(--color-primary)' : '1px solid transparent',
        transition: 'border-color 0.15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
          <LocationIcon />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', paddingTop: 10, fontWeight: 500 }}>
              АДРЕС
            </div>
            <input
              value={inputValue}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
              placeholder="Введите адрес организации"
              style={{
                width: '100%', background: 'none', border: 'none',
                padding: '4px 0 12px', fontSize: 15, color: 'var(--color-text)',
                outline: 'none',
              }}
            />
          </div>
          {inputValue && (
            <button
              onClick={() => { setInputValue(''); onChange(''); setSuggestions([]); setOpen(false) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-secondary)', fontSize: 18, lineHeight: 1, padding: 4,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--color-card)',
          borderRadius: '0 0 var(--radius) var(--radius)',
          border: '1px solid var(--color-primary)',
          borderTop: '1px solid var(--color-border)',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              style={{
                width: '100%', background: 'none', border: 'none',
                padding: '10px 16px', textAlign: 'left', cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--color-border)' : 'none',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>{s.title}</span>
              {s.subtitle && (
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.subtitle}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LocationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="var(--color-text-secondary)" />
    </svg>
  )
}
