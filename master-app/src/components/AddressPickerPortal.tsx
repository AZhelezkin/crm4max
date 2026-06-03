import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AddressSuggestInput from '@/components/AddressSuggestInput'
import { text } from '@/styles/typography'

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
        background: 'var(--color-background)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
      }}
    >
      {/* Карта на весь экран + back-кнопка и поиск-пилюля поверх (макет 8794:63351) */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <AddressSuggestInput
          value={draft}
          onChange={setDraft}
          onGeocode={(lat, lng) => setCoords({ lat, lng })}
          confirmedAddress={draft}
          onBack={onClose}
        />
      </div>

      {/* «Готово» — плавающая кнопка снизу поверх карты (макет: x12 w366 h60 rx20, низ 48) */}
      <div
        style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          zIndex: 5,
          padding: '0 12px',
          paddingBottom: 'calc(48px + env(safe-area-inset-bottom))',
          pointerEvents: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => {
            onConfirm(draft.trim(), coords)
            onClose()
          }}
          style={{
            pointerEvents: 'auto',
            width: '100%',
            height: 60,
            border: 'none',
            borderRadius: 20,
            background: 'var(--color-primary-surface)',
            color: 'var(--color-on-primary-surface)',
            cursor: 'pointer',
            ...text.subheadline,
          }}
        >
          Готово
        </button>
      </div>
    </div>,
    document.body,
  )
}
