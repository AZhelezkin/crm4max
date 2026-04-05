import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CellList, CellInput, Spinner } from '@maxhub/max-ui'
import { useAuthStore } from '@/store/auth.store'
import { mastersApi } from '@/api/masters.api'
import { uploadPhoto } from '@/api/upload.api'
import AddressSuggestInput from '@/components/AddressSuggestInput'
import uploadIconUrl from '@/assets/upload-icon.svg'
import locationAddImg from '@/assets/location-add.png'
import {
  onboardingPortalContentStyle,
  primaryActionButtonBaseStyle,
  stepOneIntroTextStyle,
  stepOnePhotoContainerStyle,
  stepOnePhotoButtonBaseStyle,
  stepOnePhotoPreviewStyle,
  stepOnePhotoPlaceholderStyle,
  stepOneTextareaWrapStyle,
  stepOneTextareaStyle,
  stepOneCounterStyle,
  stepOneAddressButtonStyle,
  stepOneAddressContentStyle,
  stepOneAddressTitleStyle,
  stepOneAddressHintStyle,
} from '@/components/onboardingStepOne.styles'

function BackArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 18l6-6-6-6" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UploadingOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 'inherit',
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Spinner size={20} appearance="contrast-static" />
    </div>
  )
}

export default function AboutMePage() {
  const navigate = useNavigate()
  const { master, setMaster } = useAuthStore()

  const [name, setName]               = useState(master?.name ?? '')
  const [contacts, setContacts]       = useState(master?.contacts ?? '')
  const [description, setDescription] = useState(master?.description ?? '')
  const [location, setLocation]       = useState(master?.location ?? '')
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving]           = useState(false)

  const [photoPreview, setPhotoPreview]     = useState<string | null>(master?.photo ?? null)
  const [photoUrl, setPhotoUrl]             = useState<string | null>(master?.photo ?? null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [showAddressPortal, setShowAddressPortal] = useState(false)
  const [addressDraft, setAddressDraft]           = useState(location)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoUploading(true)
    try {
      const url = await uploadPhoto(file, 'masters')
      setPhotoUrl(url)
    } catch (err) {
      console.error('Ошибка загрузки фото:', err)
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await mastersApi.updateProfile({
        name,
        contacts,
        description,
        location,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        ...(photoUrl ? { photo: photoUrl } : {}),
      })
      setMaster({ ...master!, ...updated })
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Заголовок */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 4px 0' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <BackArrowIcon />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }}>
          Обо мне
        </div>
        <div style={{ width: 56 }} />
      </div>

      {/* Контент */}
      <div style={onboardingPortalContentStyle}>

        <div style={stepOneIntroTextStyle}>
          Добавьте фото, чтобы вас узнавали с первого взгляда
        </div>

        {/* Аватар */}
        <div style={stepOnePhotoContainerStyle}>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={photoUploading}
            style={{ ...stepOnePhotoButtonBaseStyle, cursor: photoUploading ? 'default' : 'pointer' }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="Фото профиля" style={stepOnePhotoPreviewStyle} />
              : <img src={uploadIconUrl} alt="Загрузить фото" style={stepOnePhotoPlaceholderStyle} />
            }
            {photoUploading && <UploadingOverlay />}
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
        </div>

        {/* Имя */}
        <CellList mode="island">
          <CellInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя или название бизнеса"
          />
        </CellList>

        {/* Контакты */}
        <CellList mode="island">
          <CellInput
            value={contacts}
            onChange={(e) => setContacts(e.target.value)}
            placeholder="Контакты (телефон или ссылка)"
          />
        </CellList>

        {/* Описание */}
        <CellList mode="island">
          <div style={stepOneTextareaWrapStyle}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              placeholder="Описание"
              rows={3}
              style={stepOneTextareaStyle}
            />
            <span style={stepOneCounterStyle}>{description.length}/200</span>
          </div>
        </CellList>

        {/* Адрес */}
        <CellList mode="island">
          <button
            onClick={() => { setAddressDraft(location); setShowAddressPortal(true) }}
            style={stepOneAddressButtonStyle}
          >
            <img src={locationAddImg} alt="location" style={{ width: 24, height: 24, flexShrink: 0 }} />
            <div style={stepOneAddressContentStyle}>
              <div style={stepOneAddressTitleStyle}>Адрес</div>
              <div style={stepOneAddressHintStyle}>{location || 'Куда приезжать клиентам'}</div>
            </div>
            <ChevronIcon />
          </button>
        </CellList>

      </div>

      {/* Кнопка сохранить */}
      <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', marginTop: 'auto' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            ...primaryActionButtonBaseStyle,
            cursor: saving ? 'default' : 'pointer',
            background: 'var(--color-primary)',
            color: '#fff',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>

      {/* Портал адреса */}
      {showAddressPortal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', flexShrink: 0 }}>
            <button
              onClick={() => setShowAddressPortal(false)}
              style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <BackArrowIcon />
            </button>
            <span style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              fontSize: 16, fontWeight: 600, color: 'var(--color-text)', pointerEvents: 'none',
            }}>
              Добавление адреса
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <AddressSuggestInput
              value={addressDraft}
              onChange={setAddressDraft}
              onGeocode={(lat, lng) => setCoords({ lat, lng })}
              confirmedAddress={location}
            />
          </div>
          <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={() => { setLocation(addressDraft.trim()); setShowAddressPortal(false) }}
              style={{ ...primaryActionButtonBaseStyle, cursor: 'pointer', background: 'var(--color-primary)', color: '#fff' }}
            >
              Готово
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
