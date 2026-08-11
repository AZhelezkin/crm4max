import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AddressSuggestInput from '@/components/AddressSuggestInput'
import { text } from '@/styles/typography'
import type { BookingAddressDetails } from '@/lib/bookingAddress'

export interface AddressPickerCoords {
  lat: number
  lng: number
}

interface Props {
  open: boolean
  value: string
  onClose: () => void
  details?: BookingAddressDetails
  showDetails?: boolean
  onConfirm: (address: string, coords: AddressPickerCoords | null, details?: BookingAddressDetails) => void
}

export default function AddressPickerPortal({ open, value, details, showDetails = true, onClose, onConfirm }: Props) {
  const [draft, setDraft] = useState(value)
  const [coords, setCoords] = useState<AddressPickerCoords | null>(null)
  const [detailDraft, setDetailDraft] = useState<BookingAddressDetails>(details ?? { floor: '', apartment: '', intercom: '' })

  // При каждом открытии синкаем draft с текущим value, сбрасываем координаты
  useEffect(() => {
    if (open) {
      setDraft(value)
      setCoords(null)
      setDetailDraft(details ?? { floor: '', apartment: '', intercom: '' })
    }
  }, [open, value, details])

  // iOS: при открытии клавиатуры ужимается только visual viewport, а layout
  // viewport (по которому fixed-оверлей растянут на весь экран и центрируется
  // пин на top:50%) — нет. Из-за этого центральный пин уезжает под клавиатуру.
  // Привязываем оверлей к visualViewport, чтобы карта/пин жили строго в видимой
  // зоне над клавиатурой и пин оставался по центру видимого участка карты.
  const [viewport, setViewport] = useState<{ top: number; height: number } | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!open || !vv) { setViewport(null); return }
    const update = () => setViewport({ top: vv.offsetTop, height: vv.height })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: viewport ? viewport.top : 0,
        height: viewport ? viewport.height : '100%',
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
          onChange={(nextDraft) => {
            setDraft(nextDraft)
            setCoords(null)
          }}
          onGeocode={(lat, lng) => setCoords({ lat, lng })}
          confirmedAddress={draft}
          onBack={onClose}
        />
      </div>

      {details && showDetails && (
        <div style={{
          position: 'absolute', left: 12, right: 12, bottom: 'calc(116px + env(safe-area-inset-bottom))',
          zIndex: 5, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8,
        }}>
          <CompactMapField label="Этаж" value={detailDraft.floor} onChange={(floor) => setDetailDraft((current) => ({ ...current, floor }))} />
          <CompactMapField label="Квартира/Офис" value={detailDraft.apartment} onChange={(apartment) => setDetailDraft((current) => ({ ...current, apartment }))} />
          <CompactMapField label="Домофон" value={detailDraft.intercom} onChange={(intercom) => setDetailDraft((current) => ({ ...current, intercom }))} />
        </div>
      )}

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
            if (details) onConfirm(draft.trim(), coords, detailDraft)
            else onConfirm(draft.trim(), coords)
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

function CompactMapField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={{
      height: 56, boxSizing: 'border-box', borderRadius: 16, padding: '10px 12px',
      background: 'var(--color-background)', display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <span style={{ ...text.overline, textTransform: 'none', color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        style={{ ...text.bodyStrong, minWidth: 0, width: '100%', padding: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-on-surface)', fontFamily: 'inherit' }}
      />
    </label>
  )
}
