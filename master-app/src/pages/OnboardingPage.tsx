import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Button as MaxButton,
  CellList,
  CellSimple,
  CellInput,
  CellHeader,
  Switch,
  Panel,
  Flex,
  Grid,
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
import {
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
  durationMin: string
  durationMax: string
  price: string
  discountEnabled: boolean
  discountPercent: number
  photo: string | null        // S3 URL основного фото
  previewUrl: string | null   // local preview
  workPhotos: string[]        // S3 URLs фото работ
}

const STEPS = ['Обо мне', 'График', 'Услуги'] as const
const DAYS = [
  { v: 1, l: 'ПН' }, { v: 2, l: 'ВТ' }, { v: 3, l: 'СР' },
  { v: 4, l: 'ЧТ' }, { v: 5, l: 'ПТ' }, { v: 6, l: 'СБ' }, { v: 7, l: 'ВС' },
]
const BUFFER_OPTIONS = [0, 10, 15, 20, 30, 45, 60]
const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50]

// ─── Компонент ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { setMaster } = useAuthStore()
  const [step, setStep] = useState<Step>(0)
  const [saving, setSaving] = useState(false)

  // ── Шаг 0: Обо мне ──
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
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

  // ── Шаг 2: Услуги ──
  const [servicesSubStep, setServicesSubStep] = useState<ServicesSubStep>('categories')
  const [categories, setCategories] = useState<LocalCategory[]>([])
  const [showCatForm, setShowCatForm] = useState(false)
  const [editCatIdx, setEditCatIdx] = useState<number | null>(null)
  const [catFormName, setCatFormName] = useState('')
  const [catFormDesc, setCatFormDesc] = useState('')
  const [catFormPhoto, setCatFormPhoto] = useState<string | null>(null)       // S3 URL
  const [catFormPreview, setCatFormPreview] = useState<string | null>(null)   // local preview
  const [catPhotoUploading, setCatPhotoUploading] = useState(false)
  const catPhotoRef = useRef<HTMLInputElement>(null)

  const [servicesByCat, setServicesByCat] = useState<LocalService[][]>([])
  const [showSvcForm, setShowSvcForm] = useState(false)
  const [editSvcIdx, setEditSvcIdx] = useState<number | null>(null)
  const [svcForm, setSvcForm] = useState<LocalService>({
    name: '', desc: '', durationMin: '', durationMax: '', price: '',
    discountEnabled: false, discountPercent: 10,
    photo: null, previewUrl: null,
    workPhotos: [],
  })
  const [svcPhotoUploading, setSvcPhotoUploading] = useState(false)
  const svcPhotoRef = useRef<HTMLInputElement>(null)
  const [svcWorkPhotoUploading, setSvcWorkPhotoUploading] = useState(false)
  const svcWorkPhotoRef = useRef<HTMLInputElement>(null)
  const [selectedCatIdx, setSelectedCatIdx] = useState(0)

  // ─── Хелперы ──────────────────────────────────────────────────────────────

  const toggleDay = (d: number) =>
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    )

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
    } catch (err) {
      console.error('Ошибка загрузки фото:', err)
    } finally {
      setUploading(false)
    }
  }

  // ─── Форма категории ──────────────────────────────────────────────────────

  const openCatForm = (idx?: number) => {
    if (idx !== undefined) {
      const c = categories[idx]
      setCatFormName(c.name)
      setCatFormDesc(c.desc)
      setCatFormPhoto(c.photo)
      setCatFormPreview(c.previewUrl)
      setEditCatIdx(idx)
    } else {
      setCatFormName(''); setCatFormDesc(''); setCatFormPhoto(null); setCatFormPreview(null)
      setEditCatIdx(null)
    }
    setShowCatForm(true)
  }

  const saveCatForm = () => {
    if (!catFormName.trim()) return
    const cat: LocalCategory = {
      name: catFormName.trim(), desc: catFormDesc,
      photo: catFormPhoto, previewUrl: catFormPreview,
    }
    if (editCatIdx !== null) {
      setCategories((prev) => prev.map((c, i) => i === editCatIdx ? { ...c, ...cat } : c))
    } else {
      setCategories((prev) => [...prev, cat])
      setServicesByCat((prev) => [...prev, []])
    }
    setShowCatForm(false)
  }

  // ─── Форма услуги ─────────────────────────────────────────────────────────

  const openSvcForm = (idx?: number) => {
    if (idx !== undefined) {
      const existing = servicesByCat[selectedCatIdx]?.[idx]
      setSvcForm({ ...(existing ?? svcForm) })
      setEditSvcIdx(idx)
    } else {
      setSvcForm({ 
        name: '', desc: '', durationMin: '', durationMax: '', price: '', 
        discountEnabled: false, discountPercent: 10,
        photo: null, previewUrl: null,
        workPhotos: [],
      })
      setEditSvcIdx(null)
    }
    setShowSvcForm(true)
  }

  const saveSvcForm = () => {
    if (!svcForm.name.trim()) return
    const catIdx = selectedCatIdx
    setServicesByCat((prev: LocalService[][]) => {
      const next: LocalService[][] = prev.map((arr: LocalService[]) => [...arr])
      while (next.length <= catIdx) next.push([])
      if (editSvcIdx !== null) {
        next[catIdx] = next[catIdx].map((s: LocalService, i: number) => i === editSvcIdx ? { ...svcForm } : s)
      } else {
        next[catIdx] = [...next[catIdx], { ...svcForm }]
      }
      return next
    })
    setShowSvcForm(false)
  }

  // ─── Навигация по шагам ───────────────────────────────────────────────────

  const handleNext = async () => {
    setSaving(true)
    try {
      if (step === 0) {
        if (!name.trim()) { setSaving(false); return }
        await mastersApi.updateProfile({
          name: name.trim(),
          description,
          location,
          contacts: undefined,
          photo: photoUrl ?? undefined,
        })
        setStep(1)
        return
      }

      if (step === 1) {
        await scheduleApi.upsert({ workingDays, startTime, endTime, bufferMinutes: buffer })
        setStep(2)
        return
      }

      if (step === 2) {
        if (servicesSubStep === 'services') {
          // Возврат к категориям
          setServicesSubStep('categories')
          setSaving(false)
          return
        }

        // servicesSubStep === 'categories' — сохраняем всё и завершаем онбординг
        // Сохраняем категории в БД
        const savedCats: LocalCategory[] = []
        for (const cat of categories) {
          if (cat.name) {
            const saved = await categoriesApi.create({
              name: cat.name, description: cat.desc || undefined, photo: cat.photo || undefined,
            })
            savedCats.push({ ...cat, id: saved.id })
          }
        }

        // Сохраняем услуги по всем категориям
        for (let catIdx = 0; catIdx < savedCats.length; catIdx++) {
          const catId = savedCats[catIdx]?.id
          const svcs = servicesByCat[catIdx] ?? []
          for (const svc of svcs) {
            if (svc.name) {
              const created = await servicesApi.create({
                name: svc.name,
                description: svc.desc || undefined,
                durationMin: Number(svc.durationMin) || 30,
                durationMax: Number(svc.durationMax) || undefined,
                price: Math.round(Number(svc.price) * 100) || 0,
                discountPercent: svc.discountEnabled ? svc.discountPercent : undefined,
                photo: svc.photo || undefined,
                categoryId: catId,
              })
              for (let i = 0; i < svc.workPhotos.length; i++) {
                await servicesApi.addWorkPhoto(created.id, svc.workPhotos[i], i)
              }
            }
          }
        }

        await mastersApi.updateProfile({ isOnboarded: true })
        const master = await mastersApi.getMe()
        setMaster(master)
        navigate('/', { replace: true })
        return
      }
    } finally {
      setSaving(false)
    }
  }

  // ─── Счётчик услуг для таба ───────────────────────────────────────────────

  const servicesCount = servicesByCat.reduce((s: number, arr: LocalService[]) => s + arr.length, 0)

  // ─── Рендер ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Заголовок */}
      {true && (
        <>
          {/* Шаг 0: кастомный заголовок */}
          {step === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 4px 0' }}>
              <div style={{ width: 56, display: 'flex', justifyContent: 'center' }}>
                {/* back arrow — не активен на шаге 0 */}
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }}>
                Каким будет твой бизнес?
              </div>
              <div style={{ width: 56 }} />
            </div>
          )}

          {/* Шаг 1: кастомный заголовок */}
          {step === 1 && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 4px 0' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 4px 0' }}>
              <button
                onClick={() => {
                  if (servicesSubStep === 'services') setServicesSubStep('categories')
                  else setStep(1)
                }}
                style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }}
              >
                <BackArrowIcon />
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }}>
                {servicesSubStep === 'services' ? (categories[selectedCatIdx]?.name || 'Услуги') : 'Категории услуг'}
              </div>
              <div style={{ width: 56 }} />
            </div>
          )}
        </>
      )}

      {/* Контент */}
      <div style={onboardingPortalContentStyle}>

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
                placeholder="Имя или название бизнеса"
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
          </>
        )}

        {/* ── Шаг 2а: Категории ── */}
        {step === 2 && servicesSubStep === 'categories' && (
          <>
            {categories.map((cat, i) => {
              const count = servicesByCat[i]?.length ?? 0
              return (
                <div
                  key={i}
                  onClick={() => { setSelectedCatIdx(i); setServicesSubStep('services') }}
                  style={{ ...onboardingListCardStyle, cursor: 'pointer' }}
                >
                  <div style={onboardingListButtonStyle}>
                    {/* Фото */}
                    <div style={onboardingListMediaStyle}>
                      {cat.previewUrl
                        ? <img src={cat.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <CameraIcon size={20} />
                      }
                    </div>
                    {/* Название + кол-во услуг */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={onboardingListTitleStyle}>{cat.name}</div>
                      <div style={onboardingListSubtitleStyle}>
                        {count === 0 ? 'Нет услуг' : `${count} ${count === 1 ? 'услуга' : count < 5 ? 'услуги' : 'услуг'}`}
                      </div>
                    </div>
                    {/* Редактировать */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openCatForm(i) }}
                      style={onboardingListActionButtonStyle}
                    >
                      <EditIcon />
                    </button>
                    {/* Открыть услуги */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedCatIdx(i); setServicesSubStep('services') }}
                      style={{
                        ...onboardingListActionButtonStyle,
                        color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 1, padding: 4,
                      }}
                    >
                      ›
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Кнопка "+ Ещё категория" */}
            <MaxButton
              appearance="themed"
              mode="secondary"
              size="medium"
              stretched
              onClick={() => openCatForm()}
            >
              + Ещё категория
            </MaxButton>
          </>
        )}

        {/* ── Шаг 2б: Услуги ── */}
        {step === 2 && servicesSubStep === 'services' && (
          <>
            {/* Список услуг текущей категории */}
            {(servicesByCat[selectedCatIdx] ?? []).map((svc, i) => (
              <button
                key={i}
                onClick={() => openSvcForm(i)}
                style={{ ...onboardingListButtonStyle, alignItems: 'flex-start' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={onboardingListTitleStyle}>{svc.name}</div>
                  {svc.desc && (
                    <div style={{ ...onboardingListSubtitleStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {svc.desc}
                    </div>
                  )}
                  <div style={onboardingPriceRowStyle}>
                    {svc.discountEnabled ? (
                      <>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>
                          {formatPrice(Math.round(Number(svc.price) * 100 * (1 - svc.discountPercent / 100)) || 0)}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>
                          {formatPrice(Math.round(Number(svc.price) * 100) || 0)}
                        </span>
                        <span style={onboardingDiscountBadgeStyle}>
                          {svc.discountPercent}% СКИДКА
                        </span>
                      </>
                    ) : (
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {formatPrice(Math.round(Number(svc.price) * 100) || 0)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ paddingTop: 2, flexShrink: 0 }}>
                  <EditIcon />
                </div>
              </button>
            ))}

            {/* Добавить услугу */}
            <MaxButton
              appearance="themed"
              mode="secondary"
              size="medium"
              stretched
              onClick={() => openSvcForm()}
            >
              + Добавить услугу
            </MaxButton>
          </>
        )}

      </div>

      {/* Кнопка Далее / Готово */}
      <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          disabled={saving || photoUploading || catPhotoUploading || (step === 0 && !name.trim())}
          onClick={() => { void handleNext() }}
          style={{
            ...primaryActionButtonBaseStyle,
            cursor: saving || photoUploading || catPhotoUploading || (step === 0 && !name.trim()) ? 'default' : 'pointer',
            background: saving || photoUploading || catPhotoUploading || (step === 0 && !name.trim())
              ? 'var(--color-card2)'
              : 'var(--color-primary)',
            color: saving || photoUploading || catPhotoUploading || (step === 0 && !name.trim())
              ? 'var(--color-text-secondary)'
              : '#fff',
          }}
        >
          {saving ? 'Сохраняем...' :
           step === 2 && servicesSubStep === 'services' ? '← Назад к категориям' :
           step === 2 && servicesSubStep === 'categories' && categories.length === 0 ? 'Пропустить' :
           step === 2 && servicesSubStep === 'categories' ? 'Готово' :
           'Далее'}
        </button>
      </div>

      {/* ── Экран добавления/редактирования категории (на весь экран) ── */}
      {showCatForm && createPortal(
        <div style={{
          position: 'fixed', inset: 0,
          background: 'var(--color-bg)',
          zIndex: 200,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 4px 0', flexShrink: 0 }}>
            <button
              onClick={() => setShowCatForm(false)}
              style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }}
            >
              <BackArrowIcon />
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }}>
              {editCatIdx !== null ? 'Редактирование категории' : 'Добавление категории'}
            </div>
            <div style={{ width: 56 }} />
          </div>

          <div style={onboardingPortalContentStyle}>
            <div style={stepOneIntroTextStyle}>
              Добавьте фото категории, чтобы клиентам было проще выбирать услуги
            </div>

            <div style={stepOnePhotoContainerStyle}>
              <button
                type="button"
                onClick={() => catPhotoRef.current?.click()}
                disabled={catPhotoUploading}
                style={{
                  ...stepOnePhotoButtonBaseStyle,
                  cursor: catPhotoUploading ? 'default' : 'pointer',
                }}
              >
                {catFormPreview
                  ? <img src={catFormPreview} alt="Фото категории" style={stepOnePhotoPreviewStyle} />
                  : <img src={uploadIconUrl} alt="Загрузить фото" style={stepOnePhotoPlaceholderStyle} />}

                {catPhotoUploading && <UploadingOverlay />}
              </button>
              <input
                ref={catPhotoRef} type="file" accept="image/*" hidden
                onChange={(e) => handlePhotoChange(
                  e, setCatFormPreview, setCatPhotoUploading,
                  (url) => setCatFormPhoto(url), 'categories',
                )}
              />
            </div>

            <CellList mode="island">
              <CellInput
                value={catFormName}
                onChange={(e) => setCatFormName(e.target.value)}
                placeholder="Название"
                autoFocus
              />
            </CellList>

            <CellList mode="island">
              <div style={stepOneTextareaWrapStyle}>
                <textarea
                  value={catFormDesc}
                  onChange={(e) => setCatFormDesc(e.target.value.slice(0, 200))}
                  placeholder="Описание"
                  rows={3}
                  style={stepOneTextareaStyle}
                />
                <span style={stepOneCounterStyle}>{catFormDesc.length}/200</span>
              </div>
            </CellList>
          </div>

          <div style={{
            padding: '12px 16px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            flexShrink: 0,
          }}>
            <button
              type="button"
              disabled={!catFormName.trim() || catPhotoUploading}
              onClick={saveCatForm}
              style={{
                ...primaryActionButtonBaseStyle,
                cursor: !catFormName.trim() || catPhotoUploading ? 'default' : 'pointer',
                background: !catFormName.trim() || catPhotoUploading
                  ? 'var(--color-card2)'
                  : 'var(--color-primary)',
                color: !catFormName.trim() || catPhotoUploading
                  ? 'var(--color-text-secondary)'
                  : '#fff',
              }}
            >
              Готово
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Портал: Ввод адреса ── */}
      {showAddressPortal && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--color-bg)', zIndex: 200,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', flexShrink: 0 }}>
            <MaxButton appearance="themed" mode="tertiary" size="medium" onClick={() => setShowAddressPortal(false)}>
              ← Назад
            </MaxButton>
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
              confirmedAddress={location}
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

      {/* ── Портал: Добавление услуги ── */}
      {showSvcForm && createPortal(
        <div style={{
          position: 'fixed', inset: 0,
          background: 'var(--color-bg)',
          zIndex: 200,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 4px 0', flexShrink: 0 }}>
            <button
              onClick={() => setShowSvcForm(false)}
              style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }}
            >
              <BackArrowIcon />
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }}>
              {editSvcIdx !== null ? 'Редактирование услуги' : 'Добавление услуги'}
            </div>
            <div style={{ width: 56 }} />
          </div>

          <div style={onboardingPortalContentStyle}>
            <div style={stepOneIntroTextStyle}>
              Добавьте фото услуги и заполните информацию
            </div>

            {/* Фото услуги */}
            <div style={stepOnePhotoContainerStyle}>
              <button
                type="button"
                onClick={() => svcPhotoRef.current?.click()}
                disabled={svcPhotoUploading}
                style={{
                  ...stepOnePhotoButtonBaseStyle,
                  cursor: svcPhotoUploading ? 'default' : 'pointer',
                }}
              >
                {svcForm.previewUrl
                  ? <img src={svcForm.previewUrl} alt="Фото услуги" style={stepOnePhotoPreviewStyle} />
                  : <img src={uploadIconUrl} alt="Загрузить фото" style={stepOnePhotoPlaceholderStyle} />}

                {svcPhotoUploading && <UploadingOverlay />}
              </button>
              <input
                ref={svcPhotoRef} type="file" accept="image/*" hidden
                onChange={(e) => handlePhotoChange(
                  e, 
                  (url) => setSvcForm((f) => ({ ...f, previewUrl: url })),
                  setSvcPhotoUploading,
                  (url) => setSvcForm((f) => ({ ...f, photo: url })),
                  'services',
                )}
              />
            </div>

            {/* Название */}
            <CellList mode="island">
              <CellInput
                value={svcForm.name}
                onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Название. Пример: Укладка волос"
                autoFocus
              />
            </CellList>

            <CellList mode="island">
              <div style={stepOneTextareaWrapStyle}>
                <textarea
                  value={svcForm.desc}
                  onChange={(e) => setSvcForm((f) => ({ ...f, desc: e.target.value.slice(0, 200) }))}
                  placeholder="Описание"
                  rows={3}
                  style={stepOneTextareaStyle}
                />
                <span style={stepOneCounterStyle}>{svcForm.desc.length}/200</span>
              </div>
            </CellList>

            {/* Длительность и стоимость */}
            <div style={onboardingSplitFieldsStyle}>
              <div style={onboardingInlineFieldStyle}>
                <CellList mode="island">
                  <CellInput
                    value={svcForm.durationMin}
                    onChange={(e) => setSvcForm((f) => ({ ...f, durationMin: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Длительность от, мин"
                    inputMode="numeric"
                  />
                </CellList>
              </div>
              <div style={onboardingInlineFieldStyle}>
                <CellList mode="island">
                  <CellInput
                    value={svcForm.durationMax}
                    onChange={(e) => setSvcForm((f) => ({ ...f, durationMax: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Длительность до, мин"
                    inputMode="numeric"
                  />
                </CellList>
              </div>
            </div>

            <CellList mode="island">
              <CellInput
                value={svcForm.price}
                onChange={(e) => setSvcForm((f) => ({ ...f, price: e.target.value.replace(/[^\d.]/, '') }))}
                placeholder="Стоимость, ₽"
                inputMode="decimal"
              />
            </CellList>

            {/* Скидка */}
            <div style={onboardingToggleRowStyle}>
              <Toggle
                checked={svcForm.discountEnabled}
                onChange={(v) => setSvcForm((f) => ({ ...f, discountEnabled: v }))}
              />
              <span style={onboardingToggleLabelStyle}>Скидка</span>
              {svcForm.discountEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  <div style={{ ...onboardingSelectWrapStyle, width: 92 }}>
                    <select
                      value={svcForm.discountPercent}
                      onChange={(e) => setSvcForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))}
                      style={{ ...onboardingSelectStyle, padding: '11px 36px 11px 12px' }}
                    >
                      {DISCOUNT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <span style={onboardingSelectChevronStyle}>⌄</span>
                  </div>
                  <span style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>%</span>
                </div>
              )}
            </div>

            {/* Примеры работ */}
            <div>
              <div style={{ ...onboardingSectionLabelStyle, marginBottom: 8 }}>
                ПРИМЕРЫ РАБОТ
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {svcForm.workPhotos.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img
                      src={url}
                      alt=""
                      style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }}
                    />
                    <button
                      onClick={() => setSvcForm((f) => ({ ...f, workPhotos: f.workPhotos.filter((_, j) => j !== i) }))}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'var(--color-danger)',
                        border: 'none',
                        color: '#fff',
                        fontSize: 12,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => svcWorkPhotoRef.current?.click()}
                  disabled={svcWorkPhotoUploading}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 10,
                    background: 'var(--color-card2)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    opacity: svcWorkPhotoUploading ? 0.5 : 1,
                  }}
                >
                  {svcWorkPhotoUploading
                    ? <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Загрузка...</span>
                    : <img src={maskIconUrl} alt="upload" style={{ width: 24, height: 24 }} />}
                </button>

                <input
                  ref={svcWorkPhotoRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? [])
                    if (!files.length) return
                    setSvcWorkPhotoUploading(true)
                    try {
                      const urls = await Promise.all(files.map((f) => uploadPhoto(f, 'work')))
                      setSvcForm((prev) => ({ ...prev, workPhotos: [...prev.workPhotos, ...urls] }))
                    } catch (err) {
                      console.error('Ошибка загрузки фото работ:', err)
                    } finally {
                      setSvcWorkPhotoUploading(false)
                      e.target.value = ''
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            padding: '12px 16px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            flexShrink: 0,
          }}>
            <button
              type="button"
              disabled={!svcForm.name.trim() || svcPhotoUploading}
              onClick={saveSvcForm}
              style={{
                ...primaryActionButtonBaseStyle,
                cursor: !svcForm.name.trim() || svcPhotoUploading ? 'default' : 'pointer',
                background: !svcForm.name.trim() || svcPhotoUploading
                  ? 'var(--color-card2)'
                  : 'var(--color-primary)',
                color: !svcForm.name.trim() || svcPhotoUploading
                  ? 'var(--color-text-secondary)'
                  : '#fff',
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 26, borderRadius: 13, border: 'none',
        background: checked ? 'var(--color-primary)' : 'var(--color-card2)',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 20 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', display: 'block',
      }} />
    </button>
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
      <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>↑</span>
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

