import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import CategoriesServicesEditor, { type CategoriesServicesEditorHandle } from '@/components/CategoriesServicesEditor'
import {
  CellList,
  CellSimple,
  CellInput,
  CellHeader,
  Panel,
  Flex,
  Grid,
  Spinner,
  Switch,
  Typography,
  Container,
} from '@maxhub/max-ui'
import maskIconUrl from '@/assets/mask-icon.svg'
import uploadIconUrl from '@/assets/upload-icon.svg'
import locationAddImg from '@/assets/location-add.png'
import { mastersApi } from '@/api/masters.api'
import { scheduleApi } from '@/api/schedule.api'
import { categoriesApi, servicesApi } from '@/api/services.api'
import { uploadPhoto } from '@/api/upload.api'
import { useAuthStore } from '@/store/auth.store'
import AddressSuggestInput from '@/components/AddressSuggestInput'
import CategoryFormPortal from '@/components/CategoryFormPortal'
import ServiceFormPortal from '@/components/ServiceFormPortal'
import { type LocalWorkPhoto, getFirstUploadedWorkPhotoUrl } from '@/lib/workPhotos'
import {
  onboardingFieldInputStyle,
  onboardingFieldSuffixStyle,
  onboardingFieldWithSuffixWrapStyle,
  onboardingFieldWrapStyle,
  onboardingInlineFieldStyle,
  onboardingDiscountBadgeStyle,
  onboardingListActionButtonStyle,
  onboardingListButtonStyle,
  onboardingListCardStyle,
  onboardingListMediaStyle,
  onboardingListSubtitleStyle,
  onboardingListTitleStyle,
  onboardingPortalContentStyle,
  onboardingPriceRowStyle,
  onboardingSectionCardStyle,
  onboardingSectionLabelStyle,
  onboardingSelectChevronStyle,
  onboardingSelectStyle,
  onboardingSelectWrapStyle,
  onboardingSplitFieldsStyle,
  onboardingTimeSelectStyle,
  onboardingTimeSelectWrapStyle,
  onboardingToggleLabelStyle,
  onboardingToggleRowStyle,
  serviceWorkPhotoAddIconStyle,
  stepOneAddressButtonStyle,
  stepOneAddressContentStyle,
  stepOneAddressHintStyle,
  stepOneAddressTitleStyle,
  primaryActionButtonBaseStyle,
  stepOneCounterStyle,
  stepOneIntroTextStyle,
  stepOnePhotoButtonBaseStyle,
  stepOnePhotoContainerStyle,
  stepOnePhotoPlaceholderStyle,
  stepOnePhotoPreviewStyle,
  stepOneTextareaStyle,
  stepOneTextareaWrapStyle,
} from '@/components/onboardingStepOne.styles'
import { formatPrice, discountedPrice } from '@/types'
// AddressSuggestInput used in address portal below

// ─── Типы ─────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2
type ServicesSubStep = 'categories' | 'services'

interface LocalCategory {
  id?: string   // если уже сохранена
  name: string
  desc: string
  photo: string | null
  previewUrl: string | null
}

interface LocalService {
  name: string
  desc: string
  duration: string
  price: string
  discountEnabled: boolean
  discountPercent: number
  photo: string | null        // S3 URL обложки, берется из первого фото работ
  workPhotos: LocalWorkPhoto[]
}

const STEPS = ['Обо мне', 'График', 'Услуги'] as const
const DAYS = [
  { v: 1, l: 'ПН' }, { v: 2, l: 'ВТ' }, { v: 3, l: 'СР' },
  { v: 4, l: 'ЧТ' }, { v: 5, l: 'ПТ' }, { v: 6, l: 'СБ' }, { v: 7, l: 'ВС' },
]
const BUFFER_OPTIONS = [0, 10, 15, 20, 30, 45, 60]
const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50]

const ONBOARDING_MISSING_LABELS: Record<string, string> = {
  profile: 'заполнить профиль',
  schedule: 'настроить график',
  categories: 'добавить хотя бы одну категорию',
  services: 'добавить хотя бы одну услугу',
}

// ─── Компонент ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { setMaster } = useAuthStore()
  const [step, setStep] = useState<Step>(0)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Шаг 0: Обо мне ──
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [addressDraft, setAddressDraft] = useState('')
  const [showAddressPortal, setShowAddressPortal] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)       // S3 URL аватара
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // ── Шаг 1: График ──
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [buffer, setBuffer] = useState(30)
  const [hasBreak, setHasBreak] = useState(false)
  const [breakStart, setBreakStart] = useState('13:00')
  const [breakEnd, setBreakEnd] = useState('14:00')

  // ── Шаг 2: Услуги ──
  const [servicesSubStep, setServicesSubStep] = useState<ServicesSubStep>('categories')
  const [servicesSelectedCatName, setServicesSelectedCatName] = useState('')
  const [catCount, setCatCount] = useState(0)
  const editorRef = useRef<CategoriesServicesEditorHandle>(null)

  // ─── Хелперы ──────────────────────────────────────────────────────────────

  const toggleDay = (d: number) =>
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    )

  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '')
    const d = digits.startsWith('8') ? '7' + digits.slice(1) : digits.startsWith('7') ? digits : digits
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

  // Показывает локальный превью мгновенно, параллельно загружает в S3.
  // onUploaded(s3url) вызывается после успешной загрузки.
  const handlePhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (v: string | null) => void,
    setUploading: (v: boolean) => void,
    onUploaded: (url: string) => void,
    folder: Parameters<typeof uploadPhoto>[1] = 'masters',
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Мгновенный превью
    setPreview(URL.createObjectURL(file))
    // Загрузка в S3
    setUploading(true)
    try {
      const url = await uploadPhoto(file, folder)
      onUploaded(url)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Ошибка загрузки фото:', msg)
      setSubmitError(`Не удалось загрузить фото: ${msg}`)
    } finally {
      setUploading(false)
    }
  }

  // ─── Навигация по шагам ───────────────────────────────────────────────────

  const formatOnboardingError = (missing: unknown) => {
    if (!Array.isArray(missing) || missing.length === 0) {
      return 'Не удалось завершить онбординг. Проверьте заполнение всех шагов.'
    }

    const labels = missing
      .filter((item): item is string => typeof item === 'string')
      .map((item) => ONBOARDING_MISSING_LABELS[item] ?? item)

    if (labels.length === 0) {
      return 'Не удалось завершить онбординг. Проверьте заполнение всех шагов.'
    }

    return `Чтобы завершить онбординг, нужно ${labels.join(', ')}.`
  }

  const handleNext = async () => {
    setSubmitError(null)
    setSaving(true)
    try {
      if (step === 0) {
        if (!name.trim()) { setSaving(false); return }
        if (phone && !isValidPhone(phone)) {
          setPhoneError('Введите номер полностью: +7 (XXX) XXX-XX-XX')
          setSaving(false)
          return
        }
        await mastersApi.updateProfile({
          name: name.trim(),
          phone: phone || undefined,
          description,
          location,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
          contacts: undefined,
          photo: photoUrl ?? undefined,
          isOnboarded: false,
        })
        setStep(1)
        return
      }

      if (step === 1) {
        if (hasBreak && breakEnd <= breakStart) {
          setSubmitError('Конец обеда должен быть позже его начала')
          setSaving(false)
          return
        }
        await scheduleApi.upsert({
          workingDays, startTime, endTime, bufferMinutes: buffer,
          breakStart: hasBreak ? breakStart : undefined,
          breakEnd: hasBreak ? breakEnd : undefined,
        })
        setStep(2)
        return
      }

      if (step === 2) {
        if (servicesSubStep === 'services') {
          editorRef.current?.goToCategories()
          setServicesSubStep('categories')
          setSaving(false)
          return
        }

        // servicesSubStep === 'categories' — категории/услуги уже в БД, завершаем онбординг
        await mastersApi.updateProfile({ isOnboarded: true })
        const master = await mastersApi.getMe()
        setMaster(master)
        navigate('/', { replace: true })
        return
      }
    } catch (err: any) {
      const response = isAxiosError(err) ? err.response : undefined

      if (
        response?.status === 400
        && response.data?.error === 'Onboarding is incomplete'
      ) {
        setSubmitError(formatOnboardingError(response.data.missing))
        return
      }

      setSubmitError('Сохранение не удалось. Попробуйте еще раз.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Рендер ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Заголовок */}
      {true && (
        <>
          {/* Шаг 0: шапка в стиле клиентского кабинета (height 72, #0F0F11 / #D3D4D6 17/600) */}
          {step === 0 && (
            <div
              style={{
                height: 56,
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              <button
                onClick={() => navigate('/welcome')}
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
                Каким будет твой бизнес?
              </div>
              {/* Пустой слот для центровки заголовка (равен ширине кнопки 40) */}
              <div style={{ width: 40, flexShrink: 0 }} />
            </div>
          )}

          {/* Шаг 1: кастомный заголовок */}
          {step === 1 && (
            <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 4px' }}>
              <button
                onClick={() => setStep(0)}
                style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }}
              >
                <BackArrowIcon />
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }}>
                Настройте график работы
              </div>
              <div style={{ width: 56 }} />
            </div>
          )}

          {/* Шаг 2: кастомный заголовок */}
          {step === 2 && (
            <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 4px' }}>
              <button
                onClick={() => {
                  if (servicesSubStep === 'services') {
                    editorRef.current?.goToCategories()
                    setServicesSubStep('categories')
                  } else {
                    setStep(1)
                  }
                }}
                style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }}
              >
                <BackArrowIcon />
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }}>
                {servicesSubStep === 'services' ? (servicesSelectedCatName || 'Услуги') : 'Категории услуг'}
              </div>
              <div style={{ width: 56 }} />
            </div>
          )}
        </>
      )}

      {/* Контент */}
      <div style={{ ...onboardingPortalContentStyle, ...(step === 2 ? { display: 'none' } : {}) }}>

        {/* ── Шаг 0: Обо мне ── */}
        {step === 0 && (
          <>
            <div style={stepOneIntroTextStyle}>
              Добавьте фото, чтобы вас узнавали с первого взгляда
            </div>

            {/* Аватар */}
            <div style={stepOnePhotoContainerStyle}>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                style={{
                  ...stepOnePhotoButtonBaseStyle,
                  cursor: photoUploading ? 'default' : 'pointer',
                }}
              >
                {photoPreview
                  ? (
                    <img
                      src={photoPreview}
                      alt="Фото профиля"
                      style={stepOnePhotoPreviewStyle}
                    />
                  )
                  : <img src={uploadIconUrl} alt="Загрузить фото" style={stepOnePhotoPlaceholderStyle} />}

                {photoUploading && <UploadingOverlay />}
              </button>
              <input
                ref={photoInputRef} type="file" accept="image/*" hidden
                onChange={(e) => handlePhotoChange(
                  e,
                  setPhotoPreview,
                  setPhotoUploading,
                  (url) => setPhotoUrl(url),
                  'masters',
                )}
              />
            </div>

            {/* Имя */}
            <CellList mode="island">
              <CellInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Имя или название бизнеса*"
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
                <span style={stepOneCounterStyle}>
                  {description.length}/200
                </span>
              </div>
            </CellList>

            {/* Адрес */}
            <CellList mode="island">
              <button
                onClick={() => {
                  setAddressDraft(location)
                  setShowAddressPortal(true)
                }}
                style={stepOneAddressButtonStyle}
              >
                <img
                  src={locationAddImg}
                  alt="location"
                  style={{ width: 24, height: 24, flexShrink: 0 }}
                />
                <div style={stepOneAddressContentStyle}>
                  <div style={stepOneAddressTitleStyle}>
                    Адрес
                  </div>
                  <div style={stepOneAddressHintStyle}>
                    {location || 'Куда приезжать клиентам'}
                  </div>
                </div>
                <ChevronIcon />
              </button>
            </CellList>
          </>
        )}

        {/* ── Шаг 1: График ── */}
        {step === 1 && (
          <>
            <div style={stepOneIntroTextStyle}>
              Выберите дни и время, когда вам удобно принимать клиентов
            </div>

            <div style={onboardingSectionCardStyle}>
              <div style={onboardingSectionLabelStyle}>
                ДНИ НЕДЕЛИ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
                {DAYS.map((d) => (
                  <button
                    key={d.v}
                    onClick={() => toggleDay(d.v)}
                    style={{
                      border: 'none',
                      borderRadius: 12,
                      height: 36,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: workingDays.includes(d.v) ? 'var(--color-primary)' : 'var(--color-card2)',
                      color: workingDays.includes(d.v) ? '#fff' : 'var(--color-text)',
                    }}
                  >
                    {d.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={onboardingSectionCardStyle}>
              <div style={onboardingSectionLabelStyle}>
                ВРЕМЯ РАБОТЫ
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TimeSelect value={startTime} onChange={setStartTime} />
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>—</span>
                <TimeSelect value={endTime} onChange={setEndTime} />
              </div>
            </div>

            <div style={onboardingSectionCardStyle}>
              <div style={onboardingSectionLabelStyle}>
                ПЕРЕРЫВ МЕЖДУ ПРИЕМАМИ
              </div>
              <SelectField
                value={buffer}
                onChange={(v) => setBuffer(Number(v))}
                options={BUFFER_OPTIONS.map((m) => ({ value: m, label: m === 0 ? 'Без перерыва' : `${m} мин` }))}
              />
            </div>

            <div style={onboardingSectionCardStyle}>
              <div style={onboardingToggleRowStyle}>
                <span style={{ ...onboardingToggleLabelStyle, flex: 1 }}>Обед</span>
                <Switch
                  checked={hasBreak}
                  onChange={() => setHasBreak((v) => !v)}
                />
              </div>
              {hasBreak && (
                <div style={{ marginTop: 12 }}>
                  <div style={onboardingSectionLabelStyle}>ВРЕМЯ ОБЕДА</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TimeSelect value={breakStart} onChange={setBreakStart} />
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>—</span>
                    <TimeSelect value={breakEnd} onChange={setBreakEnd} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Шаг 2: Категории + Услуги (CategoriesServicesEditor renderит свой скролл и порталы, не внутри обёртки) ── */}

      </div>

      {step === 2 && (
        <CategoriesServicesEditor
          ref={editorRef}
          onSubStepChange={(ss, catName) => {
            setServicesSubStep(ss)
            if (catName) setServicesSelectedCatName(catName)
          }}
          onCategoryCountChange={setCatCount}
        />
      )}

      {/* Кнопка Далее / Готово */}
      <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        {submitError && (
          <div
            style={{
              marginBottom: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(209, 50, 50, 0.12)',
              color: '#9f1d1d',
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            {submitError}
          </div>
        )}
        <button
          type="button"
          disabled={saving || photoUploading || (step === 0 && !name.trim())}
          onClick={() => { void handleNext() }}
          style={{
            ...primaryActionButtonBaseStyle,
            cursor: saving || photoUploading || (step === 0 && !name.trim()) ? 'default' : 'pointer',
            background: saving || photoUploading || (step === 0 && !name.trim())
              ? 'var(--color-card2)'
              : 'var(--color-primary)',
            color: saving || photoUploading || (step === 0 && !name.trim())
              ? 'var(--color-text-secondary)'
              : '#fff',
          }}
        >
          {saving ? 'Сохраняем...' :
           step === 2 && servicesSubStep === 'services' ? '← Назад к категориям' :
           step === 2 && servicesSubStep === 'categories' && catCount === 0 ? 'Пропустить' :
           step === 2 && servicesSubStep === 'categories' ? 'Готово' :
           'Далее'}
        </button>
      </div>


      {/* ── Портал: Ввод адреса ── */}
      {showAddressPortal && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--color-bg)', zIndex: 200,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            height: 56,
            background: '#0F0F11',
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            flexShrink: 0,
          }}>
            <button
              onClick={() => setShowAddressPortal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
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
          <div style={{ flex: 1, minHeight: 0 }}>
            <AddressSuggestInput
              value={addressDraft}
              onChange={setAddressDraft}
              onGeocode={(lat, lng) => setCoords({ lat, lng })}
              confirmedAddress={addressDraft}
            />
          </div>
          <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={() => {
                setLocation(addressDraft.trim())
                setShowAddressPortal(false)
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
      )}

    </div>
  )
}

// ─── Вспомогательные компоненты ───────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...onboardingSectionLabelStyle, marginTop: 4, marginBottom: 0 }}>
      {children}
    </div>
  )
}


function SelectField({ value, onChange, options }: {
  value: number; onChange: (v: string) => void
  options: { value: number; label: string }[]
}) {
  return (
    <div style={onboardingSelectWrapStyle}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={onboardingSelectStyle}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={onboardingSelectChevronStyle}>
        ⌄
      </span>
    </div>
  )
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const [h, m] = value.split(':')
  return (
    <div style={onboardingTimeSelectWrapStyle}>
      <select
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m}`)}
        style={onboardingTimeSelectStyle}
      >
        {hours.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span style={{ color: 'var(--color-text-secondary)' }}>:</span>
      <select
        value={m}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        style={onboardingTimeSelectStyle}
      >
        {['00', '15', '30', '45'].map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  )
}

function BottomSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--color-bg)', borderRadius: '16px 16px 0 0', width: '100%', padding: 16, maxHeight: '90dvh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ручка */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-card2)', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

function CameraIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="12" cy="13" r="4" stroke="#8E8E93" strokeWidth="1.5" fill="none" />
      <path d="M12 11v1" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}


function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke="#8E8E93" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="#8E8E93" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}




function UploadingOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 'inherit',
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Spinner size={20} appearance="contrast-static" />
    </div>
  )
}

function LocationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 13.43a3.12 3.12 0 1 0 0-6.24 3.12 3.12 0 0 0 0 6.24z"
        stroke="#8E8E93" strokeWidth="1.5" />
      <path d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 0 1-7.21 0c-2.76-2.66-5.92-6.97-4.77-12.05z"
        stroke="#8E8E93" strokeWidth="1.5" />
      <path d="M12 7.5v2M11 8.5h2" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" />
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

function BackArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}






