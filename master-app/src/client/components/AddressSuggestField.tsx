import { useEffect, useRef, useState } from 'react'
import { text } from '@/styles/typography'

const SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest'
const API_KEY = import.meta.env.VITE_YANDEX_SUGGEST_KEY as string

interface Suggestion { title: string; subtitle: string }

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

/**
 * Лёгкий адресный input с Yandex-саджестами — без карты.
 * Используется на ConfirmPage внутри listItem-карточки.
 *
 * Полный адрес (title + subtitle) уходит в onChange — он же сохраняется
 * в booking.store и потом показывается на SuccessPage.
 */
export default function AddressSuggestField({ value, onChange, placeholder = 'Адрес' }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = value.trim()
    if (!open || !trimmed || !API_KEY) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          apikey: API_KEY,
          text: trimmed,
          lang: 'ru',
          results: '5',
          types: 'house,street',
          print_address: '1',
        })
        const res = await fetch(`${SUGGEST_URL}?${params}`)
        if (!res.ok) return
        const data = await res.json()
        setSuggestions(
          (data.results ?? []).map((r: { title?: { text?: string }; subtitle?: { text?: string } }) => ({
            title: r.title?.text ?? '',
            subtitle: r.subtitle?.text ?? '',
          })),
        )
      } catch {
        /* ignore */
      }
    }, 300)
  }, [value, open])

  const handleSelect = (s: Suggestion) => {
    const full = s.subtitle ? `${s.title}, ${s.subtitle}` : s.title
    onChange(full)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setTimeout(() => setOpen(false), 150) }}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          outline: 'none',
          padding: 0,
          ...text.caption2,
          color: 'var(--color-on-surface)',
          fontFamily: 'inherit',
        }}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          left: -20, right: -20,
          background: 'var(--color-surface)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          zIndex: 20,
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              style={{
                width: '100%', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '12px 16px',
                display: 'flex', flexDirection: 'column', gap: 2,
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--color-divider-low)' : 'none',
              }}
            >
              <span style={{ ...text.body, color: 'var(--color-on-surface)' }}>{s.title}</span>
              {s.subtitle && (
                <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{s.subtitle}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
