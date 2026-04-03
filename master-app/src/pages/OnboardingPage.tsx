import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Button as MaxButton,
  Avatar,
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
import { mastersApi } from '@/api/masters.api'
import { scheduleApi } from '@/api/schedule.api'
import { categoriesApi, servicesApi } from '@/api/services.api'
import { uploadPhoto } from '@/api/upload.api'
import { useAuthStore } from '@/store/auth.store'
import AddressSuggestInput from '@/components/AddressSuggestInput'
import { formatPrice, discountedPrice } from '@/types'

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
  workPhotos: string[]   // S3 URLs фото работ
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
  const [phone, setPhone] = useState('')   // 10 цифр без кода страны
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

  const [servicesByCat, setServicesByCat] = useState<LocalService[][]>([])
  const [showSvcForm, setShowSvcForm] = useState(false)
  const [editSvcIdx, setEditSvcIdx] = useState<number | null>(null)
  const [svcForm, setSvcForm] = useState<LocalService>({
    name: '', desc: '', duration: '', price: '',
    discountEnabled: false, discountPercent: 10, workPhotos: [],
  })
  const [svcWorkPhotoUploading, setSvcWorkPhotoUploading] = useState(false)
  const svcWorkPhotoRef = useRef<HTMLInputElement>(null)
  const [selectedCatIdx, setSelectedCatIdx] = useState(0)

  // ─── Хелперы ──────────────────────────────────────────────────────────────

  const toggleDay = (d: number) =>
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    )

  // Форматирование телефона: 10 цифр → +7 (XXX) XXX-XX-XX
  const formatPhoneDisplay = (digits: string) => {
    if (!digits) return ''
    let r = '+7'
    if (digits.length > 0) r += ' (' + digits.slice(0, Math.min(3, digits.length))
    if (digits.length >= 3) r += ') ' + digits.slice(3, Math.min(6, digits.length))
    if (digits.length >= 6) r += '-' + digits.slice(6, Math.min(8, digits.length))
    if (digits.length >= 8) r += '-' + digits.slice(8, 10)
    return r
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '')
    if (digits.startsWith('7') || digits.startsWith('8')) digits = digits.slice(1)
    setPhone(digits.slice(0, 10))
  }

  const phoneInvalid = phone.length > 0 && phone.length < 10

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
      setSvcForm({ ...(servicesByCat[selectedCatIdx]?.[idx] ?? svcForm) })
      setEditSvcIdx(idx)
    } else {
      setSvcForm({ name: '', desc: '', duration: '', price: '', discountEnabled: false, discountPercent: 10, workPhotos: [] })
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
          contacts: phone ? formatPhoneDisplay(phone) : undefined,
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
                durationMin: Number(svc.duration) || 30,
                price: Math.round(Number(svc.price) * 100) || 0,
                discountPercent: svc.discountEnabled ? svc.discountPercent : undefined,
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

      {/* Заголовок + табы (только для шагов 0-3, кроме подшагов услуг) */}
      {!(step === 2 && servicesSubStep !== 'categories' && false) && (
        <>


          {/* Прогресс-табы */}
          {(step !== 2 || servicesSubStep === 'categories') && (
            <div style={{
              display: 'flex', padding: '16px 16px 0',
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
              <Avatar.Container
                size={100}
                onClick={() => photoInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
                overlay={photoUploading
                  ? <Avatar.Overlay><span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>↑</span></Avatar.Overlay>
                  : undefined
                }
              >
                {photoPreview
                  ? <Avatar.Image src={photoPreview} fallback="?" />
                  : <Avatar.Icon style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <CameraIcon />
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Добавить</span>
                    </Avatar.Icon>
                }
              </Avatar.Container>
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
              <div style={{ position: 'relative' }}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                  placeholder="Описание"
                  rows={3}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    padding: '14px 16px 24px', fontSize: 16, color: 'var(--color-text)',
                    resize: 'none', display: 'block', outline: 'none',
                  }}
                />
                <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {description.length}/200
                </span>
              </div>
            </CellList>

            {/* Телефон (необязательно) */}
            <CellList mode="island" style={phoneInvalid ? { borderRadius: 'var(--radius)', outline: '1.5px solid rgba(255,59,48,0.5)' } : undefined}>
              <CellInput
                value={formatPhoneDisplay(phone)}
                onChange={handlePhoneChange}
                placeholder="Телефон"
                inputMode="tel"
              />
            </CellList>

            {/* Адрес */}
            <AddressSuggestInput value={location} onChange={setLocation} />
          </>
        )}

        {/* ── Шаг 1: График ── */}
        {step === 1 && (
          <>
            <SectionLabel>ДНИ НЕДЕЛИ, В КОТОРЫЕ РАБОТАЕТЕ</SectionLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map((d) => (
                <div key={d.v} style={{ flex: 1 }}>
                  <MaxButton
                    appearance="themed"
                    mode={workingDays.includes(d.v) ? 'primary' : 'secondary'}
                    size="small"
                    stretched
                    onClick={() => toggleDay(d.v)}
                  >
                    {d.l}
                  </MaxButton>
                </div>
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
            {categories.map((cat, i) => {
              const count = servicesByCat[i]?.length ?? 0
              return (
                <div
                  key={i}
                  style={{
                    width: '100%', background: 'var(--color-card)',
                    borderRadius: 'var(--radius)', overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                    {/* Фото */}
                    <div style={{
                      width: 46, height: 46, borderRadius: 23, overflow: 'hidden',
                      background: 'var(--color-card2)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {cat.previewUrl
                        ? <img src={cat.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <CameraIcon size={20} />
                      }
                    </div>
                    {/* Название + кол-во услуг */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{cat.name}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
                        {count === 0 ? 'Нет услуг' : `${count} ${count === 1 ? 'услуга' : count < 5 ? 'услуги' : 'услуг'}`}
                      </div>
                    </div>
                    {/* Редактировать */}
                    <button
                      onClick={() => openCatForm(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <EditIcon />
                    </button>
                    {/* Открыть услуги */}
                    <button
                      onClick={() => { setSelectedCatIdx(i); setServicesSubStep('services') }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
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
            {/* Текущая категория */}
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.3 }}>
              {categories[selectedCatIdx]?.name}
            </div>

            {/* Список услуг текущей категории */}
            {(servicesByCat[selectedCatIdx] ?? []).map((svc, i) => (
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
        <MaxButton
          appearance="themed"
          mode="primary"
          size="medium"
          stretched
          disabled={saving || photoUploading || catPhotoUploading || (step === 0 && (!name.trim() || !location.trim() || phoneInvalid))}
          onClick={handleNext}
        >
          {saving ? 'Сохраняем...' :
           step === 2 && servicesSubStep === 'services' ? '← Назад к категориям' :
           step === 2 && servicesSubStep === 'categories' && categories.length === 0 ? 'Пропустить' :
           step === 2 && servicesSubStep === 'categories' ? 'Готово' :
           'Далее'}
        </MaxButton>
      </div>

      {/* ── Экран добавления/редактирования категории (на весь экран) ── */}
      {showCatForm && createPortal(
        <div style={{
          position: 'fixed', inset: 0,
          background: 'var(--color-card)',
          zIndex: 200,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Верхний бар */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '14px 20px',
            flexShrink: 0,
          }}>
            <MaxButton
              appearance="themed"
              mode="tertiary"
              size="medium"
              onClick={() => setShowCatForm(false)}
            >
              ← Назад
            </MaxButton>
            <span style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              fontSize: 16, fontWeight: 600, color: 'var(--color-text)',
              pointerEvents: 'none',
            }}>
              {editCatIdx !== null ? 'Редактирование категории' : 'Добавление категории'}
            </span>
          </div>

          {/* Контент — скроллируется если не влезает */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Аватар — круг 110×110, по центру */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 20px 0' }}>
              <button
                onClick={() => catPhotoRef.current?.click()}
                style={{
                  width: 110, height: 110, borderRadius: '50%',
                  background: 'var(--color-card2)', border: 'none', overflow: 'hidden',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', flexShrink: 0,
                }}
              >
                {catFormPreview
                  ? <>
                      <img src={catFormPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {catPhotoUploading && <UploadingOverlay />}
                    </>
                  : <CameraIcon size={32} />
                }
              </button>
              <input
                ref={catPhotoRef} type="file" accept="image/*" hidden
                onChange={(e) => handlePhotoChange(
                  e, setCatFormPreview, setCatPhotoUploading,
                  (url) => setCatFormPhoto(url), 'categories',
                )}
              />
            </div>

            {/* Input: название */}
            <div style={{ padding: '20px 16px 0' }}>
              <CellList mode="island">
                <CellInput
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  placeholder="Название. Пример: Работа с волосами"
                  autoFocus
                />
              </CellList>
            </div>

            {/* Input: описание */}
            <div style={{ padding: '12px 16px 0' }}>
              <CellList mode="island">
                <CellInput
                  value={catFormDesc}
                  onChange={(e) => setCatFormDesc(e.target.value.slice(0, 200))}
                  placeholder="Описание. Пример: Укладка длинных волос"
                />
              </CellList>
            </div>
          </div>

          {/* Кнопка «Готово» */}
          <div style={{
            padding: '16px 20px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
            flexShrink: 0,
          }}>
            <MaxButton
              appearance="themed"
              mode="primary"
              size="medium"
              stretched
              disabled={!catFormName.trim() || catPhotoUploading}
              onClick={saveCatForm}
            >
              Готово
            </MaxButton>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Боттом-шит: Добавление услуги ── */}
      {showSvcForm && (
        <BottomSheet
          title={editSvcIdx !== null ? 'Редактирование услуги' : 'Добавление услуги'}
          onClose={() => setShowSvcForm(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            <CellList mode="island">
              <CellInput
                value={svcForm.name}
                onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Название. Пример: Укладка волос"
              />
            </CellList>

            <CellList mode="island">
              <CellInput
                value={svcForm.desc}
                onChange={(e) => setSvcForm((f) => ({ ...f, desc: e.target.value.slice(0, 200) }))}
                placeholder="Описание. Пример: Современные методы укладки волос без лака"
              />
            </CellList>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <CellList mode="island">
                  <CellInput
                    value={svcForm.duration}
                    onChange={(e) => setSvcForm((f) => ({ ...f, duration: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Длительность, мин"
                    inputMode="numeric"
                  />
                </CellList>
              </div>
              <div style={{ flex: 1 }}>
                <CellList mode="island">
                  <CellInput
                    value={svcForm.price}
                    onChange={(e) => setSvcForm((f) => ({ ...f, price: e.target.value.replace(/[^\d.]/, '') }))}
                    placeholder="Стоимость, ₽"
                    inputMode="decimal"
                  />
                </CellList>
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

            {/* Примеры работ */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
                ПРИМЕРЫ РАБОТ
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Превью загруженных фото */}
                {svcForm.workPhotos.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img
                      src={url} alt=""
                      style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }}
                    />
                    <button
                      onClick={() => setSvcForm((f) => ({ ...f, workPhotos: f.workPhotos.filter((_, j) => j !== i) }))}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--color-danger)', border: 'none',
                        color: '#fff', fontSize: 12, lineHeight: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Кнопка добавить */}
                <button
                  onClick={() => svcWorkPhotoRef.current?.click()}
                  disabled={svcWorkPhotoUploading}
                  style={{
                    width: 72, height: 72, borderRadius: 10,
                    background: 'var(--color-card2)', border: 'none', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 4, opacity: svcWorkPhotoUploading ? 0.5 : 1,
                  }}
                >
                  {svcWorkPhotoUploading
                    ? <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Загрузка...</span>
                    : <CameraIcon size={24} />
                  }
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

            <MaxButton appearance="themed" mode="primary" size="medium" stretched disabled={!svcForm.name.trim()} onClick={saveSvcForm}>Готово</MaxButton>
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
