import { text } from '@/styles/typography'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import ServicesCatalog, { type ServicesCatalogHandle } from '@/components/ServicesCatalog'
import ToggleSwitch from '@/components/ToggleSwitch'
import { mastersApi } from '@/api/masters.api'
import { scheduleApi } from '@/api/schedule.api'
import { uploadPhoto } from '@/api/upload.api'
import { useAuthStore } from '@/store/auth.store'
import AddressPickerPortal from '@/components/AddressPickerPortal'
import AvatarCropPortal from '@/components/AvatarCropPortal'
import { HeroHeader, FloatingField, ArrowLeftIcon, CameraBoldIcon, UploadingOverlay } from '@/components/onboardingShared'

// ─── Типы ─────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2

const DAYS = [
  { v: 1, l: 'ПН' }, { v: 2, l: 'ВТ' }, { v: 3, l: 'СР' },
  { v: 4, l: 'ЧТ' }, { v: 5, l: 'ПТ' }, { v: 6, l: 'СБ' }, { v: 7, l: 'ВС' },
]
const BUFFER_OPTIONS = [0, 10, 15, 20, 30, 45, 60]
const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50]

const ONBOARDING_MISSING_LABELS: Record<string, string> = {
  profile: 'заполнить профиль',
  schedule: 'настроить график',
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
  const [endTime, setEndTime] = useState('17:00')
  const [buffer, setBuffer] = useState(0)
  const [hasBreak, setHasBreak] = useState(false)
  const [breakStart, setBreakStart] = useState('13:00')
  const [breakEnd, setBreakEnd] = useState('14:00')

  // ── Шаг 2: Услуги ──
  const [svcCount, setSvcCount] = useState(0)
  const editorRef = useRef<ServicesCatalogHandle>(null)

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
        // Навигация между home/categories/services — через back в шапке (goBack).
        // Футер всегда завершает онбординг: категории/услуги уже сохранены в БД.
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

  // Кнопка завершения шага — рендерится в конце скролла каждого шага (не прибита к низу).
  const footerDisabled = saving || photoUploading
    || (step === 0 && !name.trim())
    || (step === 1 && workingDays.length === 0)
  const footerLabel = saving ? 'Сохраняем...'
    : step === 2 ? (svcCount === 0 ? 'Пропустить' : 'Готово')
    : 'Далее'
  const footerNode = (
    <>
      {submitError && (
        <div style={{
          marginBottom: 12, padding: '12px 14px', borderRadius: 14,
          background: 'rgba(209, 50, 50, 0.12)', color: 'var(--color-error-surface-accented)',
          ...text.action, lineHeight: 1.4,
        }}>
          {submitError}
        </div>
      )}
      <button
        type="button"
        disabled={footerDisabled}
        onClick={() => { void handleNext() }}
        style={{
          width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout1,
          cursor: footerDisabled ? 'default' : 'pointer',
          background: footerDisabled ? 'var(--color-secondary-surface-muted)' : 'var(--color-primary-surface)',
          color: footerDisabled ? 'var(--color-interactive-element-muted)' : 'var(--color-on-primary-surface)',
        }}
      >
        {footerLabel}
      </button>
    </>
  )

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* Заголовок step 2: услуги — плоский список, всегда «Услуги». */}
      {step === 2 && (
        <HeroHeader
          title="Услуги"
          onBack={() => {
            // goBack: false — плоский список → выходим на шаг 1.
            if (!editorRef.current?.goBack()) setStep(1)
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
          footer={footerNode}
        />
      )}

      {/* ── Шаг 1: График работы (макет shedule.svg, node 8820:29745) ── */}
      {step === 1 && (
        <Step1Form
          workingDays={workingDays} toggleDay={toggleDay}
          startTime={startTime} setStartTime={setStartTime}
          endTime={endTime} setEndTime={setEndTime}
          buffer={buffer} setBuffer={setBuffer}
          hasBreak={hasBreak} setHasBreak={setHasBreak}
          breakStart={breakStart} setBreakStart={setBreakStart}
          breakEnd={breakEnd} setBreakEnd={setBreakEnd}
          onBack={() => setStep(0)}
          footer={footerNode}
        />
      )}

      {step === 2 && (
        <ServicesCatalog
          ref={editorRef}
          onServiceCountChange={setSvcCount}
          footer={footerNode}
        />
      )}


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

// ─── Step 1: «График работы» (макет shedule.svg, node 8820:29745) ─────────────
//
// Header: круглый back 44×44 (left 12) + центрированный заголовок (titleSmall) —
// лежит на hero-градиенте (#root > div). Секции:
//   РАБОЧИЕ ДНИ — grid 4 кол × gap 8, кнопки h=69 rx=20 (88.75 = (379−24)/4)
//   ВРЕМЯ РАБОТЫ — две пилюли h=72 + тире; тоггл «Есть обед»; ниже время обеда
//   ПЕРЕРЫВ МЕЖДУ ПРИЁМАМИ — пилюля-селект h=72
// Отступы из макета (наши координаты = SVG−124): header→секция и секция→секция = 34,
// лейбл→контент = 20, строка времени→тоггл = 8.

// Время для «С/До» — шаг 30 мин (00:00 … 23:30). Дефолты 09:00–17:00 и обед 13:00–14:00 кратны 30.
const WORK_TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hh = String(Math.floor(i / 2)).padStart(2, '0')
  const mm = i % 2 === 0 ? '00' : '30'
  return `${hh}:${mm}`
})

// Метка секции — Figma «Caption 3 CAPS» 14/16/500 uppercase, on-surface-soften (#CECFD1).
const step1SectionLabelStyle: CSSProperties = {
  ...text.caption3Caps,
  color: 'var(--color-on-surface-soften)',
  marginBottom: 20,
}

// Селект-пилюля h=72 rx=20: текст body2 слева (pad 20), место под шеврон справа (pad 44).
const step1PillSelectStyle: CSSProperties = {
  width: '100%',
  height: 72,
  borderRadius: 20,
  border: 'none',
  outline: 'none',
  appearance: 'none',
  background: 'var(--color-surface-transparent)',
  color: 'var(--color-on-surface)',
  ...text.body2,
  padding: '0 44px 0 20px',
  cursor: 'pointer',
}

const step1ChevronStyle: CSSProperties = {
  position: 'absolute',
  right: 20,
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
  display: 'flex',
  color: 'var(--color-interactive-element-secondary)',
}

export interface Step1Props {
  workingDays: number[]
  toggleDay: (d: number) => void
  startTime: string
  setStartTime: (v: string) => void
  endTime: string
  setEndTime: (v: string) => void
  buffer: number
  setBuffer: (v: number) => void
  hasBreak: boolean
  setHasBreak: (v: boolean) => void
  breakStart: string
  setBreakStart: (v: string) => void
  breakEnd: string
  setBreakEnd: (v: string) => void
  onBack: () => void
  footer?: ReactNode
}

export function Step1Form(props: Step1Props) {
  const {
    workingDays, toggleDay,
    startTime, setStartTime, endTime, setEndTime,
    buffer, setBuffer,
    hasBreak, setHasBreak,
    breakStart, setBreakStart, breakEnd, setBreakEnd,
    onBack, footer,
  } = props

  return (
    <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
      <HeroHeader title="График работы" onBack={onBack} />

      {/* Контент: padding 16 по бокам; header→группа1 и группа→группа = 34 */}
      <div style={{
        marginTop: 34,
        padding: '0 16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 34,
      }}>
        {/* ── РАБОЧИЕ ДНИ ── */}
        <div>
          <div style={step1SectionLabelStyle}>Рабочие дни</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {DAYS.map((d) => {
              const active = workingDays.includes(d.v)
              return (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => toggleDay(d.v)}
                  style={{
                    height: 69,
                    borderRadius: 20,
                    border: 'none',
                    cursor: 'pointer',
                    ...text.callout1,
                    background: active ? 'var(--color-primary-surface)' : 'var(--color-surface-transparent)',
                    color: active ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)',
                  }}
                >
                  {d.l}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── ВРЕМЯ РАБОТЫ ── */}
        <div>
          <div style={step1SectionLabelStyle}>Время работы</div>
          <TimeRange
            startValue={startTime} onStartChange={setStartTime}
            endValue={endTime} onEndChange={setEndTime}
          />

          {/* «Есть обед» — карта h=68 rx=20, отступ 8 от строки времени */}
          <div style={{
            marginTop: 8,
            height: 68,
            borderRadius: 20,
            background: 'var(--color-surface-transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
          }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
              Есть обед
            </span>
            <ToggleSwitch checked={hasBreak} onChange={setHasBreak} aria-label="Есть обед" />
          </div>

          {hasBreak && (
            <div style={{ marginTop: 8 }}>
              <TimeRange
                startValue={breakStart} onStartChange={setBreakStart}
                endValue={breakEnd} onEndChange={setBreakEnd}
              />
            </div>
          )}
        </div>

        {/* ── ПЕРЕРЫВ МЕЖДУ ПРИЁМАМИ ── */}
        <div>
          <div style={step1SectionLabelStyle}>Перерыв между приёмами</div>
          <SelectPill
            value={String(buffer)}
            onChange={(v) => setBuffer(Number(v))}
            options={BUFFER_OPTIONS.map((m) => ({
              value: String(m),
              label: m === 0 ? 'Без перерыва' : `${m} мин`,
            }))}
          />
        </div>
      </div>

      {footer && (
        <div style={{ padding: '24px 16px calc(48px + env(safe-area-inset-bottom))' }}>
          {footer}
        </div>
      )}
    </div>
  )
}

// Строка границ «С … – До …»: левая пилюля — префикс «С», правая — «До»,
// тире по центру (gap из макета). Тап по пилюле открывает колесо-пикер.
function TimeRange({ startValue, onStartChange, endValue, onEndChange }: {
  startValue: string; onStartChange: (v: string) => void
  endValue: string; onEndChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <TimePillButton prefix="С" value={startValue} onChange={onStartChange} />
      </div>
      <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)' }}>–</span>
      <div style={{ flex: 1 }}>
        <TimePillButton prefix="До" value={endValue} onChange={onEndChange} />
      </div>
    </div>
  )
}

// Время без ведущего нуля у часа: "09:00" → "9:00" (как в макете).
function fmtTime(t: string): string {
  const [h, m] = t.split(':')
  return `${Number(h)}:${m}`
}

// Пилюля h=72 rx=20: префикс «С/До» (secondary) + значение (on-surface) + шеврон.
// Тап → колесо-пикер TimeWheel.
function TimePillButton({ prefix, value, onChange }: {
  prefix: string; value: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'relative',
          width: '100%',
          height: 72,
          borderRadius: 20,
          border: 'none',
          background: 'var(--color-surface-transparent)',
          padding: '0 44px 0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
        }}
      >
        <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)' }}>{prefix}</span>
        <span style={{ ...text.body2, color: 'var(--color-on-surface)' }}>{fmtTime(value)}</span>
        <span style={step1ChevronStyle}><ChevronDownIcon /></span>
      </button>
      {open && <TimeWheel value={value} onChange={onChange} onClose={() => setOpen(false)} />}
    </>
  )
}

// ── Колесо-пикер времени (макет Frame 2131327916) ──────────────────────────────
// Bottom-sheet: вертикальный scroll-snap список получасовых значений; центральный
// ряд крупный/белый, соседние тускнеют (opacity 1→0.85→0.72→0.6 = #D7/#C2/#AE на
// фоне #0E0F11) и мельче (24→18→15→12). Полоса выбора — две тонкие линии в центре.
// Без кнопки «Выбрать»: тап по ряду выбирает и закрывает; скролл двигает колесо,
// закрытие по фону фиксирует центрированное значение.
const WHEEL_ROW_H = 30        // шаг центров рядов (≈29 из макета)
const WHEEL_VISIBLE = 7       // 3 сверху + центр + 3 снизу (6:00…12:00 в макете)
const WHEEL_PAD = (WHEEL_VISIBLE * WHEEL_ROW_H - WHEEL_ROW_H) / 2  // крайние центрируются

function TimeWheel({ value, onChange, onClose }: {
  value: string; onChange: (v: string) => void; onClose: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const startIdx = Math.max(0, WORK_TIME_OPTIONS.indexOf(value))
  const [centerIdx, setCenterIdx] = useState(startIdx)

  // Центрируем текущее значение один раз при открытии (без анимации).
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = startIdx * WHEEL_ROW_H
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const idx = Math.min(WORK_TIME_OPTIONS.length - 1, Math.max(0, Math.round(el.scrollTop / WHEEL_ROW_H)))
    if (idx !== centerIdx) setCenterIdx(idx)
  }

  // Закрытие по фону фиксирует центрированное значение.
  const commitAndClose = () => { onChange(WORK_TIME_OPTIONS[centerIdx]); onClose() }

  const rowStyle = (dist: number): CSSProperties => ({
    height: WHEEL_ROW_H,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    scrollSnapAlign: 'center',
    fontSize: dist === 0 ? 24 : dist === 1 ? 18 : dist === 2 ? 15 : 12,
    lineHeight: 1,
    fontWeight: dist === 0 ? 500 : 400,
    color: 'var(--color-on-surface)',
    opacity: dist === 0 ? 1 : dist === 1 ? 0.85 : dist === 2 ? 0.72 : 0.6,
    cursor: 'pointer',
    transition: 'font-size 0.12s, opacity 0.12s',
  })

  return (
    <div
      onClick={commitAndClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-background)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 0 calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ position: 'relative', height: WHEEL_VISIBLE * WHEEL_ROW_H }}>
          {/* полоса выбора — две тонкие линии по центру */}
          <div style={{
            position: 'absolute', left: 20, right: 20,
            top: '50%', height: WHEEL_ROW_H, transform: 'translateY(-50%)',
            borderTop: '1px solid var(--color-divider-low)',
            borderBottom: '1px solid var(--color-divider-low)',
            pointerEvents: 'none',
          }} />
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{
              height: '100%', overflowY: 'auto',
              scrollSnapType: 'y mandatory',
              padding: `${WHEEL_PAD}px 0`,
              boxSizing: 'border-box',
              scrollbarWidth: 'none',
            }}
          >
            {WORK_TIME_OPTIONS.map((t, i) => (
              <div
                key={t}
                onClick={() => { onChange(t); onClose() }}
                style={rowStyle(Math.abs(i - centerIdx))}
              >
                {fmtTime(t)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SelectPill({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={step1PillSelectStyle}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={step1ChevronStyle}><ChevronDownIcon /></span>
    </div>
  )
}

// Шеврон-вниз 10×5 (макет M154 495.5L159 500.5L164 495.5), нормализован в 16×16.
function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Step 0: «Обо мне» (новый макет Figma 8794:54710) ─────────────────────────
//
// Layout: круглый back-button сверху → аватар 104×104 (фиолетовый градиент с
// иконкой камеры) → подсказка → поля (имя, описание+caption, телефон) → сегмент
// «Принимаю по адресу / Выезжаю / дистанционно» → адрес-кнопка (скрыта при
// дистанционной работе). Кнопка «Далее» рисуется родителем (общий footer).

export interface Step0Props {
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
  footer?: ReactNode
}

// Figma «Caption 2» 14/16/500 ls -0.028 — caption под полем + текст сегмента.
const captionTextStyle: CSSProperties = { ...text.caption2 }

export function Step0Form(props: Step0Props) {
  const {
    name, setName,
    phone, phoneError, onPhoneChange,
    description, setDescription,
    location,
    homeVisit, setHomeVisit,
    photoPreview, photoUploading, photoInputRef, onPhotoChange,
    onAddressClick, onBack, footer,
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

          {/* Address widget: сегмент + (опционально) поле адреса.
              Заметка к адресу редактируется на отдельном экране /address (макет 10220-101957). */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <ServiceModeSegment value={homeVisit} onChange={setHomeVisit} />
            {!homeVisit && (
              <AddressButton location={location} onClick={onAddressClick} />
            )}
          </div>
        </div>
      </div>

      {footer && (
        <div style={{ padding: '24px 16px calc(48px + env(safe-area-inset-bottom))' }}>
          {footer}
        </div>
      )}
    </div>
  )
}

// FloatingField / ClearFieldIcon вынесены в @/components/onboardingShared.

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
// ArrowLeftIcon / CameraBoldIcon вынесены в @/components/onboardingShared.

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






