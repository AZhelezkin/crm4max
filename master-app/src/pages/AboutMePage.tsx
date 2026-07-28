import { text } from '@/styles/typography'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { mastersApi } from '@/api/masters.api'
import { markGuideStep } from '@/lib/guide'
import { uploadPhoto } from '@/api/upload.api'
import AddressPickerPortal from '@/components/AddressPickerPortal'
import { Step0Form } from '@/pages/OnboardingPage'

const PROFILE_ERROR_MESSAGE = 'Не удалось сохранить фото\nпрофиля. Попробуйте ещё раз'

// «Мои данные» (Настройки → Мои данные). Переиспользует форму шага 2 онбординга
// (Step0Form): фото, имя, описание, телефон, режим работы, адрес. Сохраняет сразу
// через mastersApi.updateProfile и возвращается назад.
export default function AboutMePage() {
  const navigate = useNavigate()
  const { master, setMaster } = useAuthStore()

  const [name, setName]               = useState(master?.name ?? '')
  const [nameError, setNameError]     = useState(false)
  const [phone, setPhone]             = useState(master?.phone ?? '')
  const [phoneError, setPhoneError]   = useState<string | null>(null)
  const [description, setDescription] = useState(master?.description ?? '')
  const [location, setLocation]       = useState(master?.location ?? '')
  const [homeVisit, setHomeVisit]     = useState(master?.homeVisit ?? false)
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving]           = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

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
    if (digits === prevDigits && rawInput.length < phone.length) digits = prevDigits.slice(0, -1)
    setPhone(digits ? formatPhone(digits) : '')
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setProfileError(null)
    setPhotoUploading(true)
    try {
      const url = await uploadPhoto(file, 'masters')
      setPhotoUrl(url)
    } catch (err) {
      console.error('Ошибка загрузки фото:', err)
      setProfileError(PROFILE_ERROR_MESSAGE)
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleSave = async () => {
    const invalidName = !name.trim()
    const invalidPhone = !isValidPhone(phone)
    setNameError(invalidName)
    setPhoneError(invalidPhone ? 'Введите номер полностью: +7 (XXX) XXX-XX-XX' : null)
    if (invalidName || invalidPhone) return
    setProfileError(null)
    setSaving(true)
    try {
      const updated = await mastersApi.updateProfile({
        name,
        // null при очистке — иначе телефон/фото не обнулятся при сохранении.
        // photoUrl инициализирован из master.photo, так что не сотрёт существующее.
        phone: phone || null,
        description,
        location,
        homeVisit,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        photo: photoUrl,
      })
      setMaster({ ...master!, ...updated })
      markGuideStep('edited')
      navigate(-1)
    } catch (err) {
      console.error('Ошибка сохранения профиля:', err)
      setProfileError(PROFILE_ERROR_MESSAGE)
    } finally {
      setSaving(false)
    }
  }

  const footerDisabled = saving || photoUploading
  const saveButton = (
    <button
      type="button"
      disabled={footerDisabled}
      onClick={() => { void handleSave() }}
      style={{
        width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout1,
        cursor: footerDisabled ? 'default' : 'pointer',
        background: footerDisabled ? 'var(--color-secondary-surface-muted)' : 'var(--color-primary-surface)',
        color: footerDisabled ? 'var(--color-interactive-element-muted)' : 'var(--color-on-primary-surface)',
      }}
    >
      {saving ? 'Сохраняем...' : 'Сохранить'}
    </button>
  )

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Step0Form
        name={name} setName={(value) => { setName(value); setNameError(false) }} nameError={nameError}
        phone={phone} phoneError={phoneError} showPhoneErrorMessage={false} onPhoneChange={handlePhoneChange}
        description={description} setDescription={setDescription}
        location={location}
        homeVisit={homeVisit} setHomeVisit={setHomeVisit}
        photoPreview={photoPreview} setPhotoPreview={setPhotoPreview}
        setPhotoUrl={setPhotoUrl}
        photoUploading={photoUploading} setPhotoUploading={setPhotoUploading}
        photoInputRef={photoInputRef} onPhotoChange={handlePhotoChange}
        onAddressClick={() => setShowAddressPortal(true)}
        onBack={() => navigate(-1)}
        title="Профиль"
        showServiceMode={false}
      />

      <div style={{ padding: '24px 16px calc(48px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
        {saveButton}
      </div>

      {profileError && <ProfileErrorPopup message={profileError} />}

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

function ProfileErrorPopup({ message }: { message: string }) {
  return (
    <div style={{
      position: 'absolute', top: 40, left: 16, right: 16, zIndex: 2,
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '15px 16px',
      borderRadius: 16,
      background: 'linear-gradient(240deg, var(--color-error-popup-grad-100) 5.83%, var(--color-error-popup-grad-0) 90.48%)',
      color: 'var(--color-on-primary-surface)',
    }}>
      <ErrorIcon />
      <span style={{ ...text.body2, flex: 1, whiteSpace: 'pre-line' }}>{message}</span>
    </div>
  )
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, color: 'var(--color-error-element-muted)' }}>
      <path d="M10.0013 18.3327C14.6013 18.3327 18.3346 14.5993 18.3346 9.99935C18.3346 5.39935 14.6013 1.66602 10.0013 1.66602C5.4013 1.66602 1.66797 5.39935 1.66797 9.99935C1.66797 14.5993 5.4013 18.3327 10.0013 18.3327Z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.7487 4.16602L4.08203 15.8327" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
