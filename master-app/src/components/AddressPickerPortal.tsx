import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AddressSuggestInput from '@/components/AddressSuggestInput'
import { primaryActionButtonBaseStyle } from '@/components/onboardingStepOne.styles'

export interface AddressPickerCoords {
  lat: number
  lng: number
}

interface Props {
  open: boolean
  value: string
  onClose: () => void
  onConfirm: (address: string, coords: AddressPickerCoords | null) => void
}

export default function AddressPickerPortal({ open, value, onClose, onConfirm }: Props) {
  const [draft, setDraft] = useState(value)
  const [coords, setCoords] = useState<AddressPickerCoords | null>(null)

  // При каждом открытии синкаем draft с текущим value, сбрасываем координаты
  useEffect(() => {
    if (open) {
      setDraft(value)
      setCoords(null)
    }
  }, [open, value])

  if (!open) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-bg)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Шапка как в клиентском кабинете */}
      <div
        style={{
          height: 56,
          background: '#0F0F11',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            flexShrink: 0,
          }}
          aria-label="Назад"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15.57 17.93L9.5 12l6.07-6.07" stroke="#D3D4D6" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.5 12H9.67" stroke="#D3D4D6" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: '#D3D4D6', textAlign: 'center' }}>
          Добавление адреса
        </div>
        <div style={{ width: 40, flexShrink: 0 }} />
      </div>

      {/* Поле ввода с подсказками */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <AddressSuggestInput
          value={draft}
          onChange={setDraft}
          onGeocode={(lat, lng) => setCoords({ lat, lng })}
          confirmedAddress={draft}
        />
      </div>

      {/* Кнопка «Готово» */}
      <div
        style={{
          padding: '16px 20px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          marginTop: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => {
            onConfirm(draft.trim(), coords)
            onClose()
          }}
          style={{
            ...primaryActionButtonBaseStyle,
            cursor: 'pointer',
            background: 'var(--color-primary)',
            color: '#fff',
          }}
        >
          Готово
        </button>
      </div>
    </div>,
    document.body,
  )
}
