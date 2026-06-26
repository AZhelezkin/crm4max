import { text } from '@/styles/typography'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { mastersApi } from '@/api/masters.api'
import { uploadPhoto } from '@/api/upload.api'
import AddressPickerPortal from '@/components/AddressPickerPortal'
import { Step0Form } from '@/pages/OnboardingPage'

// «Мои данные» (Настройки → Мои данные). Переиспользует форму шага 2 онбординга
// (Step0Form): фото, имя, описание, телефон, режим работы, адрес. Сохраняет сразу
// через mastersApi.updateProfile и возвращается назад.
export default function AboutMePage() {
  const navigate = useNavigate()
  const { master, setMaster } = useAuthStore()

  const [name, setName]               = useState(master?.name ?? '')
  const [phone, setPhone]             = useState(master?.phone ?? '')
  const [phoneError, setPhoneError]   = useState<string | null>(null)
  const [description, setDescription] = useState(master?.description ?? '')
  const [location, setLocation]       = useState(master?.location ?? '')
  const [homeVisit, setHomeVisit]     = useState(master?.homeVisit ?? false)
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
    if (digits === prevDigits && rawInput.length < phone.length) digits = prevDigits.slice(0, -1)
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
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  const footerDisabled = saving || photoUploading || !name.trim()

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Step0Form
        name={name} setName={setName}
        phone={phone} phoneError={phoneError} onPhoneChange={handlePhoneChange}
        description={description} setDescription={setDescription}
        location={location}
        homeVisit={homeVisit} setHomeVisit={setHomeVisit}
        photoPreview={photoPreview} setPhotoPreview={setPhotoPreview}
        setPhotoUrl={setPhotoUrl}
        photoUploading={photoUploading} setPhotoUploading={setPhotoUploading}
        photoInputRef={photoInputRef} onPhotoChange={handlePhotoChange}
        onAddressClick={() => setShowAddressPortal(true)}
        onBack={() => navigate(-1)}
        footer={
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
        }
      />

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
