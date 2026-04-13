import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CellList, CellInput, Spinner } from '@maxhub/max-ui'
import { useAuthStore } from '@/store/auth.store'
import { mastersApi } from '@/api/masters.api'
import { uploadPhoto } from '@/api/upload.api'
import AddressPickerPortal from '@/components/AddressPickerPortal'
import AppHeader from '@/components/AppHeader'
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
  const [contacts]                     = useState(master?.contacts ?? '')
  const [phone, setPhone]             = useState(master?.phone ?? '')
  const [phoneError, setPhoneError]   = useState<string | null>(null)
  const [description, setDescription] = useState(master?.description ?? '')
  const [location, setLocation]       = useState(master?.location ?? '')
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving]           = useState(false)

  const [photoPreview, setPhotoPreview]     = useState<string | null>(master?.photo ?? null)
  const [photoUrl, setPhotoUrl]             = useState<string | null>(master?.photo ?? null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [showAddressPortal, setShowAddressPortal] = useState(false)

  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '')
    const d = digits.startsWith('8') ? '7' + digits.slice(1) : digits
    const n = d.startsWith('7') ? d : d ? '7' + d : ''
    if (!n) return ''
    let result = '+7'
    if (n.length > 1) result += ' (' + n.slice(1, 4)
    if (n.length >= 4) result += ') ' + n.slice(4, 7)
    if (n.length >= 7) result += '-' + n.slice(7, 9)
    if (n.length >= 9) result += '-' + n.slice(9, 11)
    return result
  }

  const isValidPhone = (val: string) => val.replace(/\D/g, '').length === 11

  const handlePhoneChange = (rawInput: string) => {
    setPhoneError(null)
    let digits = rawInput.replace(/\D/g, '')
    if (digits.startsWith('8')) digits = '7' + digits.slice(1)
    digits = digits.slice(0, 11)
    const prevDigits = phone.replace(/\D/g, '')
    if (digits === prevDigits && rawInput.length < phone.length) {
      digits = prevDigits.slice(0, -1)
    }
    setPhone(digits ? formatPhone(digits) : '')
  }

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
    if (phone && !isValidPhone(phone)) {
      setPhoneError('Введите номер полностью: +7 (XXX) XXX-XX-XX')
      return
    }
    setSaving(true)
    try {
      const updated = await mastersApi.updateProfile({
        name,
        contacts,
        phone: phone || undefined,
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
      <AppHeader title="Обо мне" onBack={() => navigate(-1)} />

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

        {/* Телефон */}
        <div>
          <CellList mode="island">
            <CellInput
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="Телефон"
              inputMode="tel"
            />
          </CellList>
          {phoneError && (
            <div style={{ fontSize: 13, color: 'var(--color-error, #FF3B30)', padding: '4px 16px 0' }}>{phoneError}</div>
          )}
        </div>

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
            onClick={() => setShowAddressPortal(true)}
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
      <AddressPickerPortal
        open={showAddressPortal}
        value={location}
        onClose={() => setShowAddressPortal(false)}
        onConfirm={(address, pickedCoords) => {
          setLocation(address)
          if (pickedCoords) setCoords(pickedCoords)
        }}
      />
    </div>
  )
}
