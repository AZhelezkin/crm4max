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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
        setSuggestions(
          (data.results ?? []).map((r: any) => ({
            title: r.title?.text ?? '',
            subtitle: r.subtitle?.text ?? '',
          }))
        )
      } catch {
        // сетевые ошибки игнорируем
      }
    }, 300)
  }, [inputValue])

  const handleSelect = (s: Suggestion) => {
    const full = s.subtitle ? `${s.title}, ${s.subtitle}` : s.title
    setInputValue(full)
    onChange(full)
    setSuggestions([])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 0',
        borderBottom: '1px solid var(--color-border)',
        background: 'transparent',
        flexShrink: 0,
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--color-card)', borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
        }}>
          <LocationIcon />
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              const next = e.target.value
              setInputValue(next)
              onChange(next)
            }}
            placeholder="Куда приезжать клиентам"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 15, color: 'var(--color-text)',
            }}
          />
          {inputValue && (
            <button
              onClick={() => {
                setInputValue('')
                onChange('')
                setSuggestions([])
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-secondary)', fontSize: 18, lineHeight: 1, padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
            onClick={() => handleSelect(s)}
            style={{
              width: '100%', background: 'none', border: 'none',
              padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <LocationIcon />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: 'var(--color-text)', fontWeight: 500 }}>{s.title}</div>
              {s.subtitle && (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{s.subtitle}</div>
              )}
            </div>
          </button>
        ))}

        {inputValue.trim() && suggestions.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Ничего не найдено
          </div>
        )}
      </div>
    </div>
  )
}

function LocationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="var(--color-text-secondary)" />
    </svg>
  )
}
