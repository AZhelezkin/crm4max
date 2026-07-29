import { useEffect, useRef, useState } from 'react'
import { text } from '@/styles/typography'
import { FloatingField } from '@/components/onboardingShared'

const SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest'
const API_KEY = import.meta.env.VITE_YANDEX_SUGGEST_KEY as string

interface Suggestion { title: string; subtitle: string }

interface Props {
  value: string
  onChange: (v: string) => void
  /** Плавающий лейбл над input-ом. Figma «Ваш адрес», caption2 secondary. */
  label?: string
  placeholder?: string
  details?: {
    apartment: string
    floor: string
    intercom: string
    onApartmentChange: (value: string) => void
    onFloorChange: (value: string) => void
    onIntercomChange: (value: string) => void
  }
}

/**
 * Самодостаточная карточка-input с Yandex-саджестами. Figma 8557:23640 / 8746:54653:
 *   контейнер: bg surfaceTransparent, rx 20, padding 12/20, outline 2px activeElement
 *   label:     caption2 onSurfaceSecondary
 *   input:     callout1 onSurface (bold)
 *   trailing:  X clear button (16×16) когда value не пустой
 *   suggests:  отдельная карточка ниже с title-rows и тонкими divider-low между ними
 */
export default function AddressSuggestField({
  value,
  onChange,
  label,
  placeholder = 'Адрес',
  details,
}: Props) {
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

  const handleClear = () => {
    onChange('')
    setSuggestions([])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {/* Input card. padding 12/20: верх+низ помещают label+input (14+24+нижний gap=12).
          Outline 2px activeElement; bg surfaceTransparent — вписывается между остальными карточками. */}
      <div style={{
        background: 'var(--color-surface-transparent)',
        borderRadius: 20,
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        outline: '2px solid var(--color-active-element)',
        outlineOffset: -2,
      }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {label && (
            <div style={{
              ...text.caption2, color: 'var(--color-on-surface-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {label}
            </div>
          )}
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
              ...text.callout1,
              color: 'var(--color-on-surface)',
              fontFamily: 'inherit',
            }}
          />
        </div>
        {value && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleClear() }}
            aria-label="Очистить"
            style={{
              flexShrink: 0,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* close 16×16 — крестик stroke=onSurfaceSecondary 1.5px */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="var(--color-on-surface-secondary)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions card — Figma 8746:54653: bg surfaceTransparent, rx 20,
          ряды по 49px (padding 12/20), divider-low между. */}
      {open && suggestions.length > 0 && (
        <div style={{
          background: 'var(--color-surface-transparent)',
          borderRadius: 20,
          overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              style={{
                width: '100%', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '12px 20px',
                ...text.body,
                color: 'var(--color-on-surface)',
                borderBottom: i < suggestions.length - 1
                  ? '1px solid var(--color-divider-low)'
                  : 'none',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {s.subtitle ? `${s.title}, ${s.subtitle}` : s.title}
            </button>
          ))}
        </div>
      )}

      {details && (
        <>
          <FloatingField label="Квартира" value={details.apartment} onChange={details.onApartmentChange} valueBold />
          <FloatingField label="Этаж" value={details.floor} onChange={details.onFloorChange} valueBold />
          <FloatingField label="Домофон" value={details.intercom} onChange={details.onIntercomChange} valueBold />
        </>
      )}
    </div>
  )
}
