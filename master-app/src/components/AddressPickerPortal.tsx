import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AddressSuggestInput from '@/components/AddressSuggestInput'
import AppHeader from '@/components/AppHeader'
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
      <AppHeader title="Добавление адреса" onBack={onClose} />

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
