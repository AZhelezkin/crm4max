import { text } from '@/styles/typography'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import CategoriesServicesEditor, { type CategoriesServicesEditorHandle } from '@/components/CategoriesServicesEditor'
import { Spinner } from '@maxhub/max-ui'
import ToggleSwitch from '@/components/ToggleSwitch'
import { mastersApi } from '@/api/masters.api'
import { scheduleApi } from '@/api/schedule.api'
import { uploadPhoto } from '@/api/upload.api'
import { useAuthStore } from '@/store/auth.store'
import AddressPickerPortal from '@/components/AddressPickerPortal'
import AvatarCropPortal from '@/components/AvatarCropPortal'
import AppHeader from '@/components/AppHeader'
import {
  onboardingPortalContentStyle,
  onboardingSectionCardStyle,
  onboardingSectionLabelStyle,
  onboardingSelectChevronStyle,
  onboardingSelectStyle,
  onboardingSelectWrapStyle,
  onboardingTimeSelectStyle,
  onboardingTimeSelectWrapStyle,
  onboardingToggleLabelStyle,
  onboardingToggleRowStyle,
  primaryActionButtonBaseStyle,
  stepOneIntroTextStyle,
} from '@/components/onboardingStepOne.styles'

// ─── Типы ─────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2
type ServicesSubStep = 'categories' | 'services'

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
  const [showAddressPortal, setShowAddressPortal] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)       // S3 URL аватара
  const [photoUploading, setPhotoUploading] = useState(false)
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null)  // object URL для экрана обрезки
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [homeVisit, setHomeVisit] = useState(false)

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

  // Аватар: выбор файла → экран обрезки (макет 8794:56697) → загрузка обрезанного в S3.
  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''                      // позволяет выбрать тот же файл повторно
    if (!file) return
    setAvatarCropSrc(URL.createObjectURL(file))
  }

  const uploadAvatar = async (file: File) => {
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoUploading(true)
    try {
      const url = await uploadPhoto(file, 'masters')
      setPhotoUrl(url)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Ошибка загрузки фото:', msg)
      setSubmitError(`Не удалось загрузить фото: ${msg}`)
    } finally {
      setPhotoUploading(false)
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
          homeVisit,
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
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* Заголовок (для step 0 back-кнопка отрисовывается внутри Step0Form — макет без title-bar) */}
      {step === 1 && (
        <AppHeader
          title="Настройте график работы"
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <AppHeader
          title={servicesSubStep === 'services' ? (servicesSelectedCatName || 'Услуги') : 'Категории услуг'}
          onBack={() => {
            if (servicesSubStep === 'services') {
              editorRef.current?.goToCategories()
              setServicesSubStep('categories')
            } else {
              setStep(1)
            }
          }}
        />
      )}

      {/* ── Шаг 0: Обо мне (новый макет: круглый back, hero-аватар, поля h=72, сегмент работа/выезд) ── */}
      {step === 0 && (
        <Step0Form
          name={name} setName={setName}
          phone={phone} phoneError={phoneError} onPhoneChange={handlePhoneChange}
          description={description} setDescription={setDescription}
          location={location}
          homeVisit={homeVisit} setHomeVisit={setHomeVisit}
          photoPreview={photoPreview} setPhotoPreview={setPhotoPreview}
          setPhotoUrl={setPhotoUrl}
          photoUploading={photoUploading} setPhotoUploading={setPhotoUploading}
          photoInputRef={photoInputRef}
          onPhotoChange={handleAvatarPick}
          onAddressClick={() => setShowAddressPortal(true)}
          onBack={() => navigate('/welcome')}
        />
      )}

      {/* Контент (step 1) */}
      <div style={{ ...onboardingPortalContentStyle, ...(step !== 1 ? { display: 'none' } : {}) }}>

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
                      ...text.footnote,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: workingDays.includes(d.v) ? 'var(--color-primary-surface)' : 'var(--color-secondary-surface)',
                      color: workingDays.includes(d.v) ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)',
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
                <span style={{ color: 'var(--color-on-surface-secondary)', fontWeight: 600 }}>—</span>
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
                <ToggleSwitch
                  checked={hasBreak}
                  onChange={setHasBreak}
                  aria-label="Обед"
                />
              </div>
              {hasBreak && (
                <div style={{ marginTop: 12 }}>
                  <div style={onboardingSectionLabelStyle}>ВРЕМЯ ОБЕДА</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TimeSelect value={breakStart} onChange={setBreakStart} />
                    <span style={{ color: 'var(--color-on-surface-secondary)', fontWeight: 600 }}>—</span>
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

      {/* Кнопка Далее / Готово
          Step 0 (Figma 8794:65467): footer pt-8 px-12 pb-48, button h=60, radius 20,
            disabled bg secondarySurfaceMuted + interactiveElementMuted text.
          Step 1/2 (старый стиль): pt/pb 12 px-16, button h=48. */}
      {(() => {
        const disabled = saving || photoUploading || (step === 0 && !name.trim())
        const buttonLabel = saving ? 'Сохраняем...' :
          step === 2 && servicesSubStep === 'services' ? '← Назад к категориям' :
          step === 2 && servicesSubStep === 'categories' && catCount === 0 ? 'Пропустить' :
          step === 2 && servicesSubStep === 'categories' ? 'Готово' :
          'Далее'

        const footerStyle: CSSProperties = step === 0
          ? { padding: '8px 12px', paddingBottom: 'calc(48px + env(safe-area-inset-bottom))' }
          : { padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }

        const buttonStyle: CSSProperties = step === 0
          ? {
              width: '100%',
              height: 60,
              borderRadius: 20,
              border: 'none',
              padding: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...text.callout1,
              cursor: disabled ? 'default' : 'pointer',
              background: disabled
                ? 'var(--color-secondary-surface-muted)'
                : 'var(--color-primary-surface)',
              color: disabled
                ? 'var(--color-interactive-element-muted)'
                : 'var(--color-on-primary-surface)',
            }
          : {
              ...primaryActionButtonBaseStyle,
              cursor: disabled ? 'default' : 'pointer',
              background: disabled
                ? 'var(--color-secondary-surface)'
                : 'var(--color-primary-surface)',
              color: disabled
                ? 'var(--color-on-surface-secondary)'
                : 'var(--color-on-primary-surface)',
            }

        return (
          <div style={footerStyle}>
            {submitError && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: 'rgba(209, 50, 50, 0.12)',
                  color: 'var(--color-error-surface-accented)',
                  ...text.action,
                  lineHeight: 1.4,
                }}
              >
                {submitError}
              </div>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => { void handleNext() }}
              style={buttonStyle}
            >
              {buttonLabel}
            </button>
          </div>
        )
      })()}


      {/* ── Портал: Ввод адреса ── */}
      <AddressPickerPortal
        open={showAddressPortal}
        value={location}
        onClose={() => setShowAddressPortal(false)}
        onConfirm={(address, pickedCoords) => {
          setLocation(address)
          if (pickedCoords) setCoords(pickedCoords)
        }}
      />

      {/* ── Портал: Обрезка аватара (макет 8794:56697) ── */}
      <AvatarCropPortal
        open={!!avatarCropSrc}
        src={avatarCropSrc ?? ''}
        onCancel={() => {
          if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc)
          setAvatarCropSrc(null)
        }}
        onConfirm={(file) => {
          if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc)
          setAvatarCropSrc(null)
          void uploadAvatar(file)
        }}
      />

    </div>
  )
}

// ─── Вспомогательные компоненты ───────────────────────────────────────────────

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
      <span style={{ color: 'var(--color-on-surface-secondary)' }}>:</span>
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

// ─── Step 0: «Обо мне» (новый макет Figma 8794:54710) ─────────────────────────
//
// Layout: круглый back-button сверху → аватар 104×104 (фиолетовый градиент с
// иконкой камеры) → подсказка → поля (имя, описание+caption, телефон) → сегмент
// «Принимаю по адресу / Выезжаю / дистанционно» → адрес-кнопка (скрыта при
// дистанционной работе). Кнопка «Далее» рисуется родителем (общий footer).

interface Step0Props {
  name: string
  setName: (v: string) => void
  phone: string
  phoneError: string | null
  onPhoneChange: (v: string) => void
  description: string
  setDescription: (v: string) => void
  location: string
  homeVisit: boolean
  setHomeVisit: (v: boolean) => void
  photoPreview: string | null
  setPhotoPreview: (v: string | null) => void
  setPhotoUrl: (v: string | null) => void
  photoUploading: boolean
  setPhotoUploading: (v: boolean) => void
  photoInputRef: RefObject<HTMLInputElement>
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onAddressClick: () => void
  onBack: () => void
}

// Figma «Body 2» 17/24/400 ls -0.17 — текст полей.
const fieldTextStyle: CSSProperties = { ...text.body2 }
// Figma «Caption 2» 14/16/500 ls -0.028 — caption под полем + текст сегмента.
const captionTextStyle: CSSProperties = { ...text.caption2 }

function Step0Form(props: Step0Props) {
  const {
    name, setName,
    phone, phoneError, onPhoneChange,
    description, setDescription,
    location,
    homeVisit, setHomeVisit,
    photoPreview, photoUploading, photoInputRef, onPhotoChange,
    onAddressClick, onBack,
  } = props

  // Описание: auto-grow textarea (до 7 строк по 24px = 168px, потом скролл).
  const descRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = descRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxContentH = 7 * 24 // 168
    el.style.height = `${Math.min(el.scrollHeight, maxContentH)}px`
  }, [description])

  const showCounter = description.length >= 190

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Back-кнопка — absolute overlay (в Figma header.toolbarTop лежит
          поверх Form, а не в потоке выше неё; иначе аватар съезжает на
          лишних 56px вниз). pointer-events: none на обёртке, auto на
          кнопке — чтобы скролл проходил, а саму кнопку можно тапать. */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center',
          padding: '6px 12px',
          height: 56,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад"
          style={{
            width: 44, height: 44,
            borderRadius: '50%',
            background: 'var(--color-background)',
            color: 'var(--color-on-surface-soften)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            pointerEvents: 'auto',
          }}
        >
          <ArrowLeftIcon />
        </button>
      </div>

      {/* Form: padding 32/16 + gap 35 между секциями (аватар, подсказка, fields).
          Top=32 — back-кнопка слева overlap’ается с этой зоной без конфликта
          (avatar по центру, кнопка слева → не пересекаются по x). */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 35,
        padding: '32px 16px 0', width: '100%',
      }}>
        {/* Аватар 104×104 — белый круг с фиолетовым градиентом и белой иконкой камеры */}
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={photoUploading}
          aria-label="Загрузить фото профиля"
          style={{
            width: 104, height: 104,
            borderRadius: '50%',
            border: 'none',
            padding: 0,
            position: 'relative',
            overflow: 'hidden',
            background: photoPreview
              ? 'transparent'
              : 'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)',
            cursor: photoUploading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Фото профиля"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ color: '#FFFFFF', display: 'flex' }}>
              <CameraBoldIcon />
            </div>
          )}
          {photoUploading && <UploadingOverlay />}
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPhotoChange}
        />

        {/* Подсказка под аватаром */}
        <div style={{
          ...text.body,
          letterSpacing: -0.15,
          color: 'var(--color-on-surface-soften)',
          textAlign: 'center',
        }}>
          Добавьте фото, чтобы вас узнавали
        </div>

        {/* Поля */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
          {/* Имя — плавающий лейбл (макет 8794:60965) */}
          <FloatingField
            label="Имя или название бизнеса"
            value={name}
            onChange={setName}
          />

          {/* Описание — плавающий лейбл, auto-grow, счётчик при ≥190 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <FloatingField
              multiline
              label="Описание"
              value={description}
              onChange={(v) => setDescription(v.slice(0, 200))}
              inputRef={descRef}
              maxLength={200}
            />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 8px',
            }}>
              <div style={{
                ...captionTextStyle,
                flex: 1,
                color: 'var(--color-on-surface-secondary)',
              }}>
                Какие услуги вы представляете? Например, парикмахер-стилист
              </div>
              {showCounter && (
                <div style={{
                  ...captionTextStyle,
                  color: 'var(--color-on-surface-secondary)',
                  flexShrink: 0,
                }}>
                  {description.length}/200
                </div>
              )}
            </div>
          </div>

          {/* Телефон */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
            <FloatingField
              label="Телефон"
              value={phone}
              onChange={onPhoneChange}
              type="tel"
              inputMode="tel"
            />
            {phoneError && (
              <div style={{
                ...text.footnote,
                color: 'var(--color-error-surface-accented)',
                padding: '0 8px',
              }}>
                {phoneError}
              </div>
            )}
          </div>

          {/* Address widget: сегмент + (опционально) поле адреса */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <ServiceModeSegment value={homeVisit} onChange={setHomeVisit} />
            {!homeVisit && (
              <AddressButton location={location} onClick={onAddressClick} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Поле с плавающим лейблом (макет 8794:60965) ──────────────────────────────
// Пусто → плейсхолдер по центру. Есть значение/фокус → лейбл всплывает наверх
// (caption, on-surface-secondary), значение под ним (body2). Фокус → фон surface
// + рамка 2px active-element. Крестик очистки — при фокусе и непустом значении.
// Вертикаль (single-line): 15 + label 16 + gap 2 + value 24 + 15 = 72.
interface FloatingFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  inputMode?: 'text' | 'tel' | 'numeric' | 'email'
  maxLength?: number
  multiline?: boolean
  inputRef?: RefObject<HTMLTextAreaElement>
}

function FloatingField({
  label, value, onChange, type = 'text', inputMode, maxLength, multiline = false, inputRef,
}: FloatingFieldProps) {
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0
  const showClear = focused && value.length > 0

  const innerInputStyle: CSSProperties = {
    ...fieldTextStyle,
    width: '100%',
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--color-on-surface)',
    padding: 0,
    fontFamily: 'inherit',
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: 72,
      boxSizing: 'border-box',
      borderRadius: 20,
      padding: '15px 20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      background: focused ? 'var(--color-surface)' : 'var(--color-surface-transparent)',
      boxShadow: focused ? 'inset 0 0 0 2px var(--color-active-element)' : undefined,
      transition: 'background 0.15s ease, box-shadow 0.15s ease',
    }}>
      {/* paddingRight резервирует место под крестик, чтобы текст не залезал под него */}
      <div style={{ display: 'flex', flexDirection: 'column', paddingRight: showClear ? 32 : 0 }}>
        {floated && (
          <span style={{
            ...text.caption,
            color: 'var(--color-on-surface-secondary)',
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {label}
          </span>
        )}
        {multiline ? (
          <textarea
            ref={inputRef}
            value={value}
            placeholder={floated ? '' : label}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={1}
            maxLength={maxLength}
            style={{ ...innerInputStyle, resize: 'none', overflowY: 'auto' }}
          />
        ) : (
          <input
            type={type}
            inputMode={inputMode}
            value={value}
            placeholder={floated ? '' : label}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={maxLength}
            style={innerInputStyle}
          />
        )}
      </div>
      {showClear && (
        <button
          type="button"
          aria-label="Очистить"
          // preventDefault на mousedown — чтобы не терять фокус поля при клике на крестик
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 20,
            top: '50%',
            transform: 'translateY(-50%)',   // крестик по центру высоты поля (макет 8794:60965)
            width: 24,
            height: 24,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-interactive-element-secondary)',
          }}
        >
          <ClearFieldIcon />
        </button>
      )}
    </div>
  )
}

// Крестик очистки — X 10×10 (макет: M349 473L339 483 …), нормализован в 24×24.
function ClearFieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M17 7L7 17M7 7L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Сегмент-контрол «По адресу / Дистанционно» ────────────────────────────────
// Figma: 2 chip-кнопки 50/50, gap 8, h ≈ 72 (padding 12/8 + icon 24 + gap 4 + text 16×2).
// Активный: bg activeSurface (#003D7F), icon + text — белые с opacity 0.8.
// Неактивный: bg surfaceTransparent, icon + text — activeElement (#409BFE).
function ServiceModeSegment({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  // value=false → «Принимаю по адресу» активно (homeVisit=false по умолчанию).
  return (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      <ModeChip
        active={!value}
        onClick={() => onChange(false)}
        icon={<LocationOutlineIcon />}
        label={<>Принимаю<br />по адресу</>}
      />
      <ModeChip
        active={value}
        onClick={() => onChange(true)}
        icon={<CallIcon />}
        label="Выезжаю / работаю дистанционно"
      />
    </div>
  )
}

function ModeChip({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: ReactNode; label: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? 'var(--color-active-surface)' : 'var(--color-surface-transparent)',
        color: active ? 'rgba(255, 255, 255, 0.8)' : 'var(--color-active-element)',
        border: 'none',
        borderRadius: 20,
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
      }}
    >
      <div style={{ width: 24, height: 24, display: 'flex' }}>{icon}</div>
      <div style={{
        ...captionTextStyle,
        textAlign: 'center',
        color: 'inherit',
      }}>
        {label}
      </div>
    </button>
  )
}

// ── Адрес-кнопка ──────────────────────────────────────────────────────────────
// Figma: bg surfaceTransparent, h=72, radius 20, padding 16/20, gap 12.
// Иконка-плюс-локейшен в круглом 44×44 контейнере (padding 10, radius 12).
function AddressButton({ location, onClick }: { location: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'var(--color-surface-transparent)',
        border: 'none',
        borderRadius: 20,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 44, height: 44,
        borderRadius: 12,
        padding: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'var(--color-interactive-element-muted)',
      }}>
        <LocationAddIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          ...text.callout1,
          color: 'var(--color-on-surface)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          Адрес
        </div>
        <div style={{
          ...captionTextStyle,
          color: 'var(--color-on-surface-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {location || 'Куда приезжать клиентам'}
        </div>
      </div>
      <div style={{
        width: 16, height: 16,
        display: 'flex',
        flexShrink: 0,
        color: 'var(--color-interactive-element-muted)',
      }}>
        <ChevronRightIcon />
      </div>
    </button>
  )
}

// ─── Иконки (vuesax, viewBox указан в каждом SVG) ─────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CameraBoldIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M24 8C23.1867 8 22.44 7.53333 22.0667 6.81333L21.1067 4.88C20.4933 3.66667 18.8933 2.66667 17.5333 2.66667H14.48C13.1067 2.66667 11.5067 3.66667 10.8933 4.88L9.93333 6.81333C9.56 7.53333 8.81333 8 8 8C5.10667 8 2.81333 10.44 3 13.32L3.69333 24.3333C3.85333 27.08 5.33333 29.3333 9.01333 29.3333H22.9867C26.6667 29.3333 28.1333 27.08 28.3067 24.3333L29 13.32C29.1867 10.44 26.8933 8 24 8ZM14 9.66667H18C18.5467 9.66667 19 10.12 19 10.6667C19 11.2133 18.5467 11.6667 18 11.6667H14C13.4533 11.6667 13 11.2133 13 10.6667C13 10.12 13.4533 9.66667 14 9.66667ZM16 24.16C13.52 24.16 11.4933 22.1467 11.4933 19.6533C11.4933 17.16 13.5067 15.1467 16 15.1467C18.4933 15.1467 20.5067 17.16 20.5067 19.6533C20.5067 22.1467 18.48 24.16 16 24.16Z" fill="currentColor" fillOpacity="0.6" />
    </svg>
  )
}

function LocationOutlineIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 13.43C13.7231 13.43 15.12 12.0331 15.12 10.31C15.12 8.58687 13.7231 7.19 12 7.19C10.2769 7.19 8.88 8.58687 8.88 10.31C8.88 12.0331 10.2769 13.43 12 13.43Z" stroke="currentColor" strokeWidth="2" />
      <path d="M3.62 8.49C5.59 -0.17 18.42 -0.16 20.38 8.5C21.53 13.58 18.37 17.88 15.6 20.54C13.59 22.48 10.41 22.48 8.39 20.54C5.63 17.88 2.47 13.57 3.62 8.49Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CallIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21.97 18.33C21.97 18.69 21.89 19.06 21.72 19.42C21.55 19.78 21.33 20.12 21.04 20.44C20.55 20.98 20.01 21.37 19.4 21.62C18.8 21.87 18.15 22 17.45 22C16.43 22 15.34 21.76 14.19 21.27C13.04 20.78 11.89 20.12 10.75 19.29C9.6 18.45 8.51 17.52 7.47 16.49C6.44 15.45 5.51 14.36 4.68 13.22C3.86 12.08 3.2 10.94 2.72 9.81C2.24 8.67 2 7.58 2 6.54C2 5.86 2.12 5.21 2.36 4.61C2.6 4 2.98 3.44 3.51 2.94C4.15 2.31 4.85 2 5.59 2C5.87 2 6.15 2.06 6.4 2.18C6.66 2.3 6.89 2.48 7.07 2.74L9.39 6.01C9.57 6.26 9.7 6.49 9.79 6.71C9.88 6.92 9.93 7.13 9.93 7.32C9.93 7.56 9.86 7.8 9.72 8.03C9.59 8.26 9.4 8.5 9.16 8.74L8.4 9.53C8.29 9.64 8.24 9.77 8.24 9.93C8.24 10.01 8.25 10.08 8.27 10.16C8.3 10.24 8.33 10.3 8.35 10.36C8.53 10.69 8.84 11.12 9.28 11.64C9.73 12.16 10.21 12.69 10.73 13.22C11.27 13.75 11.79 14.24 12.32 14.69C12.84 15.13 13.27 15.43 13.61 15.61C13.66 15.63 13.72 15.66 13.79 15.69C13.87 15.72 13.95 15.73 14.04 15.73C14.21 15.73 14.34 15.67 14.45 15.56L15.21 14.81C15.46 14.56 15.7 14.37 15.93 14.25C16.16 14.11 16.39 14.04 16.64 14.04C16.83 14.04 17.03 14.08 17.25 14.17C17.47 14.26 17.7 14.39 17.95 14.56L21.26 16.91C21.52 17.09 21.7 17.3 21.81 17.55C21.91 17.8 21.97 18.05 21.97 18.33Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
    </svg>
  )
}

function LocationAddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.25 11H14.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 13.75V8.25" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M3.62 8.49C5.59 -0.17 18.42 -0.16 20.38 8.5C21.53 13.58 18.37 17.88 15.6 20.54C13.59 22.48 10.41 22.48 8.39 20.54C5.63 17.88 2.47 13.57 3.62 8.49Z" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5.94 13.28L10.2867 8.93333C10.8 8.42 10.8 7.58 10.2867 7.06667L5.94 2.72" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}






