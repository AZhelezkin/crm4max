import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mastersApi } from '@/api/masters.api'
import { scheduleApi } from '@/api/schedule.api'
import { categoriesApi, servicesApi } from '@/api/services.api'
import { uploadPhoto } from '@/api/upload.api'
import { useAuthStore } from '@/store/auth.store'
import Button from '@/components/Button'
import { formatPrice, discountedPrice } from '@/types'

// ─── Типы ─────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3
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
}

const STEPS = ['Обо мне', 'График', 'Услуги', 'Карта'] as const
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

  const [services, setServices] = useState<LocalService[]>([])
  const [showSvcForm, setShowSvcForm] = useState(false)
  const [editSvcIdx, setEditSvcIdx] = useState<number | null>(null)
  const [svcForm, setSvcForm] = useState<LocalService>({
    name: '', desc: '', duration: '', price: '',
    discountEnabled: false, discountPercent: 10,
  })
  const [selectedCatIdx, setSelectedCatIdx] = useState(0)

  // ── Шаг 3: Карта ──
  const [cardNumber, setCardNumber] = useState('')
  const [cardMM, setCardMM] = useState('')
  const [cardYY, setCardYY] = useState('')

  // ─── Хелперы ──────────────────────────────────────────────────────────────

  const toggleDay = (d: number) =>
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    )

  const formatCard = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
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
    }
    setShowCatForm(false)
  }

  // ─── Форма услуги ─────────────────────────────────────────────────────────

  const openSvcForm = (idx?: number) => {
    if (idx !== undefined) {
      setSvcForm({ ...services[idx] })
      setEditSvcIdx(idx)
    } else {
      setSvcForm({ name: '', desc: '', duration: '', price: '', discountEnabled: false, discountPercent: 10 })
      setEditSvcIdx(null)
    }
    setShowSvcForm(true)
  }

  const saveSvcForm = () => {
    if (!svcForm.name.trim()) return
    if (editSvcIdx !== null) {
      setServices((prev) => prev.map((s, i) => i === editSvcIdx ? { ...svcForm } : s))
    } else {
      setServices((prev) => [...prev, { ...svcForm }])
    }
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
        if (servicesSubStep === 'categories') {
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
          setCategories(savedCats)
          setServicesSubStep('services')
          return
        }
        // Сохраняем услуги
        const catId = categories[selectedCatIdx]?.id
        for (const svc of services) {
          if (svc.name) {
            await servicesApi.create({
              name: svc.name,
              description: svc.desc || undefined,
              durationMin: Number(svc.duration) || 30,
              price: Math.round(Number(svc.price) * 100) || 0,
              discountPercent: svc.discountEnabled ? svc.discountPercent : undefined,
              categoryId: catId,
            })
          }
        }
        setStep(3)
        return
      }

      if (step === 3) {
        const digits = cardNumber.replace(/\s/g, '')
        if (digits.length >= 4) {
          const masked = '•••• •••• ••••' + ' ' + digits.slice(-4)
          await mastersApi.updatePayment({ cardNumber: masked })
        }
        const master = await mastersApi.getMe()
        setMaster(master)
        navigate('/', { replace: true })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSkipCard = async () => {
    const master = await mastersApi.getMe()
    setMaster(master)
    navigate('/', { replace: true })
  }

  // ─── Счётчик услуг для таба ───────────────────────────────────────────────

  const servicesCount = services.length

  // ─── Рендер ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Заголовок + табы (только для шагов 0-3, кроме подшагов услуг) */}
      {!(step === 2 && servicesSubStep !== 'categories' && false) && (
        <>
          <div style={{ padding: '20px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            {step === 2 && servicesSubStep === 'services' && (
              <button
                onClick={() => setServicesSubStep('categories')}
                style={{ background: 'none', border: 'none', color: 'var(--color-text)', fontSize: 22, lineHeight: 1, padding: 0 }}
              >
                ←
              </button>
            )}
            <h1 style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>
              {step === 2 && servicesSubStep === 'categories' ? 'Добавьте категории услуги' :
               step === 2 && servicesSubStep === 'services' ? 'Добавьте услуги' :
               'Каким будет твой бизнес?'}
            </h1>
            {step === 2 && (
              <button
                onClick={() => { setStep(3); setServicesSubStep('categories') }}
                style={{
                  background: 'var(--color-card2)', border: 'none', borderRadius: 8,
                  width: 28, height: 28, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: 16,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Прогресс-табы (только для шагов 0,1,3) */}
          {step !== 2 && (
            <div style={{
              display: 'flex', padding: '16px 16px 0',
              borderBottom: '1px solid var(--color-border)',
            }}>
              {STEPS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => { if (i < step) setStep(i as Step) }}
                  style={{
                    flex: 1, minWidth: 0, background: 'none', border: 'none',
                    padding: '8px 4px 12px',
                    borderBottom: step === i ? '2px solid var(--color-primary)' : '2px solid transparent',
                    color: step === i ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontSize: 13, fontWeight: 500, cursor: i < step ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label === 'Услуги' ? `Услуги ${servicesCount > 0 ? servicesCount : ''}`.trim() : label}
                </button>
              ))}
            </div>
          )}

          {/* Подзаголовок для шага 2 */}
          {step === 2 && servicesSubStep === 'categories' && (
            <div style={{ padding: '12px 16px 0', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5 }}>
              ВНУТРИ КАТЕГОРИЙ БУДУТ УСЛУГИ
            </div>
          )}
          {step === 2 && servicesSubStep === 'services' && (
            <div style={{ padding: '12px 16px 0', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5 }}>
              ТО, ЗА ЧТО ВЫ БЕРЁТЕ ОПЛАТУ
            </div>
          )}
        </>
      )}

      {/* Контент */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Шаг 0: Обо мне ── */}
        {step === 0 && (
          <>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 4 }}>
              Добавьте фото, чтобы вас узнавали с первого взгляда
            </div>

            {/* Аватар */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: 100, height: 100, borderRadius: '50%',
                  background: 'var(--color-card)',
                  border: 'none', overflow: 'hidden', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                {photoPreview
                  ? <>
                      <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {photoUploading && <UploadingOverlay />}
                    </>
                  : <>
                      <CameraIcon />
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Добавить</span>
                    </>
                }
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

            {/* Имя + описание */}
            <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Имя или название бизнеса"
                style={{
                  width: '100%', background: 'none', border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  padding: '14px 16px', fontSize: 16, color: 'var(--color-text)',
                }}
              />
              <div style={{ position: 'relative' }}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                  placeholder="Описание"
                  rows={3}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    padding: '14px 16px 24px', fontSize: 16, color: 'var(--color-text)',
                    resize: 'none', display: 'block',
                  }}
                />
                <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {description.length}/200
                </span>
              </div>
            </div>

            {/* Адрес */}
            <ListRow
              icon={<LocationIcon />}
              label="Адрес"
              sub="Куда приезжать клиентам"
              value={location}
              onClick={() => { const v = prompt('Введите адрес'); if (v) setLocation(v) }}
            />
          </>
        )}

        {/* ── Шаг 1: График ── */}
        {step === 1 && (
          <>
            <SectionLabel>ДНИ НЕДЕЛИ, В КОТОРЫЕ РАБОТАЕТЕ</SectionLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map((d) => (
                <button
                  key={d.v}
                  onClick={() => toggleDay(d.v)}
                  style={{
                    flex: 1, minWidth: 36, padding: '12px 0',
                    borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
                    background: workingDays.includes(d.v) ? 'var(--color-primary)' : 'var(--color-card)',
                    color: workingDays.includes(d.v) ? '#fff' : 'var(--color-text-secondary)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {d.l}
                </button>
              ))}
            </div>

            <SectionLabel>ВРЕМЯ РАБОТЫ</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TimeSelect value={startTime} onChange={setStartTime} />
              <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
              <TimeSelect value={endTime} onChange={setEndTime} />
            </div>

            <SectionLabel>ПЕРЕРЫВ МЕЖДУ ПРИЁМАМИ</SectionLabel>
            <SelectField
              value={buffer}
              onChange={(v) => setBuffer(Number(v))}
              options={BUFFER_OPTIONS.map((m) => ({ value: m, label: m === 0 ? 'Без перерыва' : `${m} мин` }))}
            />
          </>
        )}

        {/* ── Шаг 2а: Категории ── */}
        {step === 2 && servicesSubStep === 'categories' && (
          <>
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => openCatForm(i)}
                style={{
                  width: '100%', background: 'var(--color-card)', border: 'none',
                  borderRadius: 'var(--radius)', padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                {/* Фото категории */}
                <div style={{
                  width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
                  background: 'var(--color-card2)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {cat.previewUrl
                    ? <img src={cat.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <CameraIcon size={20} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{cat.name}</div>
                  {cat.desc && (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat.desc}
                    </div>
                  )}
                </div>
                <EditIcon />
              </button>
            ))}

            {/* Кнопка добавить категорию */}
            <button
              onClick={() => openCatForm()}
              style={{
                width: '100%', background: 'var(--color-card)', border: 'none',
                borderRadius: 'var(--radius)', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--color-card2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: 'var(--color-text-secondary)',
              }}>+</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 15, color: 'var(--color-text)', fontWeight: 500 }}>Добавить категорию</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 1 }}>Пример: Стрижки и уход</div>
              </div>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 18 }}>›</span>
            </button>
          </>
        )}

        {/* ── Шаг 2б: Услуги ── */}
        {step === 2 && servicesSubStep === 'services' && (
          <>
            {/* Переключатель категорий (если несколько) */}
            {categories.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {categories.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCatIdx(i)}
                    style={{
                      whiteSpace: 'nowrap', padding: '6px 14px',
                      borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 500,
                      background: selectedCatIdx === i ? 'var(--color-primary)' : 'var(--color-card)',
                      color: selectedCatIdx === i ? '#fff' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Список услуг */}
            {services.map((svc, i) => (
              <button
                key={i}
                onClick={() => openSvcForm(i)}
                style={{
                  width: '100%', background: 'var(--color-card)', border: 'none',
                  borderRadius: 'var(--radius)', padding: '12px 14px',
                  display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{svc.name}</div>
                  {svc.desc && (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {svc.desc}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    {svc.discountEnabled ? (
                      <>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>
                          {formatPrice(Math.round(Number(svc.price) * 100 * (1 - svc.discountPercent / 100)) || 0)}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>
                          {formatPrice(Math.round(Number(svc.price) * 100) || 0)}
                        </span>
                        <span style={{
                          background: 'var(--color-danger)', color: '#fff',
                          fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                        }}>
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
                <EditIcon />
              </button>
            ))}

            {/* Добавить услугу */}
            <button
              onClick={() => openSvcForm()}
              style={{
                width: '100%', background: 'var(--color-card)', border: 'none',
                borderRadius: 'var(--radius)', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--color-card2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: 'var(--color-text-secondary)',
              }}>+</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 15, color: 'var(--color-text)', fontWeight: 500 }}>Добавить услугу</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 1 }}>Пример: Укладка длинных волос</div>
              </div>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 18 }}>›</span>
            </button>
          </>
        )}

        {/* ── Шаг 3: Карта ── */}
        {step === 3 && (
          <>
            <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCard(e.target.value))}
                placeholder="Номер карты"
                inputMode="numeric"
                style={{
                  width: '100%', background: 'var(--color-card2)', border: 'none',
                  borderRadius: 'var(--radius-sm)', padding: '14px 16px',
                  fontSize: 18, letterSpacing: 2, color: 'var(--color-text)',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={cardMM}
                  onChange={(e) => setCardMM(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="ММ"
                  inputMode="numeric"
                  maxLength={2}
                  style={{
                    flex: 1, background: 'var(--color-card2)', border: 'none',
                    borderRadius: 'var(--radius-sm)', padding: '14px',
                    fontSize: 16, textAlign: 'center', color: 'var(--color-text)',
                  }}
                />
                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-secondary)' }}>/</span>
                <input
                  value={cardYY}
                  onChange={(e) => setCardYY(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="ГГ"
                  inputMode="numeric"
                  maxLength={2}
                  style={{
                    flex: 1, background: 'var(--color-card2)', border: 'none',
                    borderRadius: 'var(--radius-sm)', padding: '14px',
                    fontSize: 16, textAlign: 'center', color: 'var(--color-text)',
                  }}
                />
                <input
                  placeholder="CVV/CVC"
                  inputMode="numeric"
                  maxLength={3}
                  style={{
                    flex: 2, background: 'var(--color-card2)', border: 'none',
                    borderRadius: 'var(--radius-sm)', padding: '14px',
                    fontSize: 16, textAlign: 'center', color: 'var(--color-text)',
                  }}
                />
              </div>

              {/* Платёжные системы */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                {[
                  { label: 'МИР', color: '#00A859', bg: '#fff' },
                  { label: 'MC', color: '#EB5757', bg: '#fff' },
                  { label: 'VISA', color: '#1A1F71', bg: '#fff' },
                  { label: 'UP', color: '#C00', bg: '#fff' },
                ].map((s) => (
                  <div key={s.label} style={{
                    background: s.bg, borderRadius: 6,
                    padding: '4px 10px', fontSize: 11, fontWeight: 700,
                    color: s.color,
                  }}>
                    {s.label}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                <span>🔒</span>
                <span>Защита сертификатом SSL и протоколом 3D Secure</span>
              </div>
            </div>

            <button
              style={{
                width: '100%', background: 'var(--color-card)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)', padding: '14px',
                color: 'var(--color-text)', fontSize: 15, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span>📷</span> Сфотографировать
            </button>

            <button
              onClick={handleSkipCard}
              style={{
                background: 'none', border: 'none', color: 'var(--color-text-secondary)',
                fontSize: 14, cursor: 'pointer', textAlign: 'center', padding: '8px',
              }}
            >
              Пропустить
            </button>
          </>
        )}
      </div>

      {/* Кнопка Далее / Готово */}
      <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <Button
          onClick={handleNext}
          fullWidth
          disabled={saving || photoUploading || catPhotoUploading || (step === 0 && !name.trim())}
        >
          {saving ? 'Сохраняем...' :
           step === 3 ? 'Готово' :
           step === 2 && servicesSubStep === 'categories' && categories.length === 0 ? 'Пропустить' :
           'Далее'}
        </Button>
      </div>

      {/* ── Боттом-шит: Добавление категории ── */}
      {showCatForm && (
        <BottomSheet
          title={editCatIdx !== null ? 'Редактирование категории' : 'Добавление категории'}
          onClose={() => setShowCatForm(false)}
        >
          {/* Фото категории */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <button
              onClick={() => catPhotoRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'var(--color-card2)', border: 'none', overflow: 'hidden',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}
            >
              {catFormPreview
                ? <>
                    <img src={catFormPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {catPhotoUploading && <UploadingOverlay />}
                  </>
                : <CameraIcon />
              }
            </button>
            <input
              ref={catPhotoRef} type="file" accept="image/*" hidden
              onChange={(e) => handlePhotoChange(
                e,
                setCatFormPreview,
                setCatPhotoUploading,
                (url) => setCatFormPhoto(url),
                'categories',
              )}
            />
          </div>

          <div style={{ background: 'var(--color-card2)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 12 }}>
            <input
              value={catFormName}
              onChange={(e) => setCatFormName(e.target.value)}
              placeholder="Название. Пример: Работа с волосами"
              style={{
                width: '100%', background: 'none', border: 'none',
                borderBottom: '1px solid var(--color-border)',
                padding: '14px 16px', fontSize: 15, color: 'var(--color-text)',
              }}
            />
            <div style={{ position: 'relative' }}>
              <input
                value={catFormDesc}
                onChange={(e) => setCatFormDesc(e.target.value.slice(0, 200))}
                placeholder="Описание. Пример: Укладка длинных волос"
                style={{
                  width: '100%', background: 'none', border: 'none',
                  padding: '14px 56px 14px 16px', fontSize: 15, color: 'var(--color-text)',
                }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {catFormDesc.length}/200
              </span>
            </div>
          </div>

          <Button onClick={saveCatForm} fullWidth disabled={!catFormName.trim()}>Готово</Button>
        </BottomSheet>
      )}

      {/* ── Боттом-шит: Добавление услуги ── */}
      {showSvcForm && (
        <BottomSheet
          title={editSvcIdx !== null ? 'Редактирование услуги' : 'Добавление услуги'}
          onClose={() => setShowSvcForm(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Категория */}
            {categories.length > 0 && (
              <select
                value={selectedCatIdx}
                onChange={(e) => setSelectedCatIdx(Number(e.target.value))}
                style={selectStyle}
              >
                {categories.map((c, i) => <option key={i} value={i}>{c.name}</option>)}
              </select>
            )}

            <input
              value={svcForm.name}
              onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Название. Пример: Укладка волос"
              style={inputStyle}
            />

            <div style={{ position: 'relative' }}>
              <textarea
                value={svcForm.desc}
                onChange={(e) => setSvcForm((f) => ({ ...f, desc: e.target.value.slice(0, 200) }))}
                placeholder="Описание. Пример: Современные методы укладки волос без лака"
                rows={3}
                style={{ ...inputStyle, resize: 'none', paddingBottom: 28 }}
              />
              <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {svcForm.desc.length}/200
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={svcForm.duration}
                  onChange={(e) => setSvcForm((f) => ({ ...f, duration: e.target.value.replace(/\D/g, '') }))}
                  placeholder="Продолжительность"
                  inputMode="numeric"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  МИН
                </span>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={svcForm.price}
                  onChange={(e) => setSvcForm((f) => ({ ...f, price: e.target.value.replace(/[^\d.]/, '') }))}
                  placeholder="Стоимость"
                  inputMode="decimal"
                  style={{ ...inputStyle, paddingRight: 30 }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--color-text-secondary)' }}>
                  ₽
                </span>
              </div>
            </div>

            {/* Скидка */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle
                checked={svcForm.discountEnabled}
                onChange={(v) => setSvcForm((f) => ({ ...f, discountEnabled: v }))}
              />
              <span style={{ fontSize: 15, fontWeight: 500 }}>Скидка</span>
              {svcForm.discountEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  <select
                    value={svcForm.discountPercent}
                    onChange={(e) => setSvcForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))}
                    style={{
                      background: 'var(--color-card2)', border: 'none',
                      borderRadius: 8, padding: '8px 12px',
                      fontSize: 15, color: 'var(--color-text)', cursor: 'pointer',
                    }}
                  >
                    {DISCOUNT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <span style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>%</span>
                </div>
              )}
            </div>

            {/* Примеры работ (плейсхолдер) */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
                ПРИМЕРЫ РАБОТ
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{
                  width: 72, height: 72, borderRadius: 10,
                  background: 'var(--color-card2)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CameraIcon size={24} />
                </button>
              </div>
            </div>

            <Button onClick={saveSvcForm} fullWidth disabled={!svcForm.name.trim()}>Готово</Button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── Вспомогательные компоненты ───────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5, marginTop: 4 }}>
      {children}
    </div>
  )
}

function ListRow({ icon, label, sub, value, onClick }: {
  icon: React.ReactNode; label: string; sub: string; value?: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: 'var(--color-card)', border: 'none',
        borderRadius: 'var(--radius)', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: 'var(--color-text)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 1 }}>{value || sub}</div>
      </div>
      <span style={{ color: 'var(--color-text-secondary)', fontSize: 18 }}>›</span>
    </button>
  )
}

function SelectField({ value, onChange, options }: {
  value: number; onChange: (v: string) => void
  options: { value: number; label: string }[]
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', background: 'var(--color-card)', border: 'none',
          borderRadius: 'var(--radius-sm)', padding: '14px 40px 14px 16px',
          fontSize: 16, color: 'var(--color-text)', cursor: 'pointer', appearance: 'none',
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', pointerEvents: 'none' }}>
        ⌄
      </span>
    </div>
  )
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const [h, m] = value.split(':')
  return (
    <div style={{
      flex: 1, background: 'var(--color-card)', borderRadius: 'var(--radius-sm)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 8px',
    }}>
      <select
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m}`)}
        style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--color-text)', cursor: 'pointer' }}
      >
        {hours.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span style={{ color: 'var(--color-text-secondary)' }}>:</span>
      <select
        value={m}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--color-text)', cursor: 'pointer' }}
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

function LocationIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        stroke="#2688EB" strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="9" r="2.5" stroke="#2688EB" strokeWidth="1.8" fill="none" />
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

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-card2)', border: 'none',
  borderRadius: 'var(--radius-sm)', padding: '14px 16px',
  fontSize: 15, color: 'var(--color-text)',
}

const selectStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-card2)', border: 'none',
  borderRadius: 'var(--radius-sm)', padding: '14px 16px',
  fontSize: 15, color: 'var(--color-text)', appearance: 'none', cursor: 'pointer',
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
