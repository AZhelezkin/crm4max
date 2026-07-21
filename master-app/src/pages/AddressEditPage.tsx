import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'
import { useAuthStore } from '@/store/auth.store'
import { mastersApi } from '@/api/masters.api'
import AddressPickerPortal from '@/components/AddressPickerPortal'
import { HeroHeader, FloatingField } from '@/components/onboardingShared'

// «Адрес, где оказывается услуга» (макет 10220-101957) — открывается карандашом
// виджета адреса на главной: строка «Адрес» → пикер адреса, поле «Комментарий»
// (заметка «как пройти»), «Сохранить» → updateProfile и назад.
export default function AddressEditPage() {
  const navigate = useNavigate()
  const { master, setMaster } = useAuthStore()

  const [location, setLocation] = useState(master?.location ?? '')
  const [note, setNote] = useState(master?.locationNote ?? '')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const updated = await mastersApi.updateProfile({
        location: location || null,
        locationNote: note || null,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      })
      setMaster({ ...master!, ...updated })
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Адрес, где оказывается услуга" onBack={() => navigate(-1)} />

      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Адрес: иконка location-add + «Адрес» / подпись (или выбранный адрес) + стрелка */}
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--color-surface-transparent)', borderRadius: 20,
            padding: '16px 20px', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ padding: 10, display: 'inline-flex', flexShrink: 0, color: 'var(--color-on-surface)' }}>
            <LocationAddIcon />
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Адрес</span>
            <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {location || 'Куда приезжать клиентам'}
            </span>
          </span>
          <span style={{ flexShrink: 0, display: 'inline-flex', color: 'var(--color-interactive-element-secondary)' }}>
            <ChevronRightIcon />
          </span>
        </button>

        {/* Комментарий (заметка к адресу: вход, звонок и т.п.) — макет textField 10304-45837:
            top-align, авто-рост до 7 строк со скроллом, счётчик у лимита. */}
        <FloatingField
          multiline
          align="top"
          autoGrow
          showCounter
          label="Комментарий"
          value={note}
          onChange={(v) => setNote(v.slice(0, 300))}
          maxLength={300}
        />
      </div>

      {/* Сохранить */}
      <div style={{ padding: '8px 12px calc(16px + env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => { void handleSave() }}
          style={{
            width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout1,
            cursor: saving ? 'default' : 'pointer',
            background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)',
          }}
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>

      <AddressPickerPortal
        open={showPicker}
        value={location}
        onClose={() => setShowPicker(false)}
        onConfirm={(address, pickedCoords) => {
          setLocation(address)
          if (pickedCoords) setCoords(pickedCoords)
        }}
      />
    </div>
  )
}

// vuesax/linear/location-add (24×24).
function LocationAddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 0 1-7.21 0c-2.77-2.66-5.93-6.97-4.77-12.05Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.25 10.5h5.5M12 7.75v5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4L10.5 8L6 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
