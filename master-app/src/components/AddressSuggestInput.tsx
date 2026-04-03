import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  const [modalOpen, setModalOpen] = useState(false)

  const openModal = () => setModalOpen(true)
  const closeModal = () => setModalOpen(false)

  const handleSelect = (address: string) => {
    onChange(address)
    closeModal()
  }

  return (
    <>
      {/* Триггер — отображает текущее значение, открывает модал */}
      <button
        onClick={openModal}
        style={{
          width: '100%', background: 'var(--color-card)', border: 'none',
          borderRadius: 'var(--radius)', padding: '0 16px',
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <LocationIcon />
        <div style={{ flex: 1, padding: '10px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: 2 }}>
            АДРЕС
          </div>
          <div style={{ fontSize: 15, color: value ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
            {value || 'Куда приезжать клиентам'}
          </div>
        </div>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 18 }}>›</span>
      </button>

      {modalOpen && createPortal(
        <AddressModal
          initialValue={value}
          onSelect={handleSelect}
          onClose={closeModal}
        />,
        document.body,
      )}
    </>
  )
}

// ─── Полноэкранный модал поиска адреса ────────────────────────────────────────

function AddressModal({ initialValue, onSelect, onClose }: {
  initialValue: string
  onSelect: (address: string) => void
  onClose: () => void
}) {
  const [inputValue, setInputValue] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [modalHeight, setModalHeight] = useState<number>(window.innerHeight)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Автофокус при открытии
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // visualViewport — корректная высота с учётом клавиатуры на iOS/Android
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setModalHeight(vv.height)
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  // Закрытие по Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Фетч саджестов с дебаунсом
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
    onSelect(full)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: modalHeight,
      background: 'var(--color-bg)',
      zIndex: 1000,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Шапка с инпутом */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-card)',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-primary)', fontSize: 15, padding: '4px 0', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <span>←</span><span>Назад</span>
        </button>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
        }}>
          <LocationIcon />
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Куда приезжать клиентам"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 15, color: 'var(--color-text)',
            }}
          />
          {inputValue && (
            <button
              onClick={() => setInputValue('')}
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

      {/* Список саджестов — скроллируемый */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
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
