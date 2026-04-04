import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Spinner } from '@maxhub/max-ui'
import { categoriesApi, servicesApi } from '@/api/services.api'
import { uploadPhoto } from '@/api/upload.api'
import type { Category, Service } from '@/types'
import { formatPrice, formatDuration, discountedPrice } from '@/types'
import PageHeader from '@/components/PageHeader'
import maskIconUrl from '@/assets/mask-icon.svg'
import uploadIconUrl from '@/assets/upload-icon.svg'
import {
  onboardingDiscountBadgeStyle,
  onboardingFieldInputStyle,
  onboardingFieldSuffixStyle,
  onboardingFieldWithSuffixWrapStyle,
  onboardingFieldWrapStyle,
  onboardingListActionButtonStyle,
  onboardingListButtonStyle,
  onboardingListCardStyle,
  onboardingListMediaStyle,
  onboardingListSubtitleStyle,
  onboardingListTitleStyle,
  onboardingPortalContentStyle,
  onboardingPriceRowStyle,
  onboardingSectionLabelStyle,
  onboardingSelectChevronStyle,
  onboardingSelectStyle,
  onboardingSelectWrapStyle,
  onboardingToggleLabelStyle,
  primaryActionButtonBaseStyle,
  serviceWorkPhotoAddIconStyle,
  stepOneCounterStyle,
  stepOneIntroTextStyle,
  stepOnePhotoButtonBaseStyle,
  stepOnePhotoContainerStyle,
  stepOnePhotoPlaceholderStyle,
  stepOnePhotoPreviewStyle,
  stepOneTextareaStyle,
  stepOneTextareaWrapStyle,
} from '@/components/onboardingStepOne.styles'

const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50]

interface LocalWorkPhoto {
  id: string
  url: string | null
  previewUrl: string
  uploading: boolean
}

function getFirstUploadedWorkPhotoUrl(workPhotos: LocalWorkPhoto[]): string | null {
  return workPhotos.find((p) => !p.uploading && p.url)?.url ?? null
}

export default function ServicesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(new Set())

  // Форма категории
  const [showCatForm, setShowCatForm] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catPhotoPreview, setCatPhotoPreview] = useState<string | null>(null)
  const [catPhotoUrl, setCatPhotoUrl] = useState<string | null>(null)
  const [catPhotoUploading, setCatPhotoUploading] = useState(false)
  const catPhotoRef = useRef<HTMLInputElement>(null)

  // Форма услуги
  const [showSvcForm, setShowSvcForm] = useState(false)
  const [editService, setEditService] = useState<Service | null>(null)
  const [svcCategoryId, setSvcCategoryId] = useState('')
  const [svcName, setSvcName] = useState('')
  const [svcDesc, setSvcDesc] = useState('')
  const [svcPrice, setSvcPrice] = useState('')
  const [svcDuration, setSvcDuration] = useState('')
  const [svcDiscountEnabled, setSvcDiscountEnabled] = useState(false)
  const [svcDiscountPercent, setSvcDiscountPercent] = useState(10)
  const [svcWorkPhotos, setSvcWorkPhotos] = useState<LocalWorkPhoto[]>([])
  const [svcWorkPhotoUploading, setSvcWorkPhotoUploading] = useState(false)
  const svcWorkPhotoRef = useRef<HTMLInputElement>(null)

  const load = () => categoriesApi.list().then(setCategories).catch(() => {})
  useEffect(() => { load() }, [])

  // ─── Категория ──────────────────────────────────────────────────────────────

  const openCatForm = (cat?: Category) => {
    if (cat) {
      setEditCatId(cat.id)
      setCatName(cat.name)
      setCatDesc(cat.description ?? '')
      setCatPhotoPreview(cat.photo)
      setCatPhotoUrl(cat.photo)
    } else {
      setEditCatId(null)
      setCatName(''); setCatDesc(''); setCatPhotoPreview(null); setCatPhotoUrl(null)
    }
    setShowCatForm(true)
  }

  const saveCatForm = async () => {
    if (!catName.trim()) return
    const data = { name: catName.trim(), description: catDesc || undefined, photo: catPhotoUrl || undefined }
    if (editCatId) await categoriesApi.update(editCatId, data)
    else await categoriesApi.create(data)
    setShowCatForm(false)
    load()
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Удалить категорию и все её услуги?')) return
    await categoriesApi.remove(id)
    load()
  }

  // ─── Услуга ─────────────────────────────────────────────────────────────────

  const openSvcForm = (service?: Service, defaultCatId?: string) => {
    if (service) {
      setEditService(service)
      setSvcName(service.name)
      setSvcDesc(service.description ?? '')
      setSvcPrice(String(service.price / 100))
      setSvcDuration(String(service.durationMin))
      setSvcCategoryId(service.categoryId ?? '')
      setSvcDiscountEnabled(!!service.discountPercent)
      setSvcDiscountPercent(service.discountPercent ?? 10)
      setSvcWorkPhotos(
        (service.workPhotos ?? []).map((p) => ({
          id: p.id, url: p.url, previewUrl: p.url, uploading: false,
        })),
      )
    } else {
      setEditService(null)
      setSvcName(''); setSvcDesc(''); setSvcPrice(''); setSvcDuration('')
      setSvcCategoryId(defaultCatId ?? categories[0]?.id ?? '')
      setSvcDiscountEnabled(false); setSvcDiscountPercent(10)
      setSvcWorkPhotos([])
    }
    setShowSvcForm(true)
  }

  const saveSvcForm = async () => {
    if (!svcName.trim()) return
    const firstPhotoUrl = getFirstUploadedWorkPhotoUrl(svcWorkPhotos)
    const data = {
      name: svcName.trim(),
      description: svcDesc || undefined,
      price: Math.round(Number(svcPrice) * 100) || 0,
      durationMin: Number(svcDuration) || 30,
      categoryId: svcCategoryId || undefined,
      discountPercent: svcDiscountEnabled ? svcDiscountPercent : undefined,
      photo: firstPhotoUrl || undefined,
    }
    if (editService) {
      await servicesApi.update(editService.id, data)
      const origIds = new Set((editService.workPhotos ?? []).map((p) => p.id))
      const currentIds = new Set(svcWorkPhotos.map((p) => p.id))
      for (const id of origIds) {
        if (!currentIds.has(id)) await servicesApi.removeWorkPhoto(id)
      }
      const newPhotos = svcWorkPhotos.filter((p) => !origIds.has(p.id) && p.url)
      for (let i = 0; i < newPhotos.length; i++) {
        await servicesApi.addWorkPhoto(editService.id, newPhotos[i].url as string, i)
      }
    } else {
      const created = await servicesApi.create(data)
      const uploaded = svcWorkPhotos.filter((p) => !p.uploading && p.url)
      for (let i = 0; i < uploaded.length; i++) {
        await servicesApi.addWorkPhoto(created.id, uploaded[i].url as string, i)
      }
    }
    setShowSvcForm(false)
    load()
  }

  const handleDeleteService = async (id: string) => {
    await servicesApi.remove(id)
    load()
  }

  const toggleCat = (id: string) => {
    setExpandedCatIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ─── Рендер ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="Услуги" />

      <div style={{ padding: '8px 16px 100px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Список категорий — аккордеон */}
        {categories.map((cat) => {
          const expanded = expandedCatIds.has(cat.id)
          return (
            <div key={cat.id} style={onboardingListCardStyle}>

              {/* Заголовок категории */}
              <div
                onClick={() => toggleCat(cat.id)}
                style={{
                  ...onboardingListButtonStyle,
                  borderRadius: 0,
                  borderBottom: expanded ? '1px solid var(--color-border)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={onboardingListMediaStyle}>
                  {cat.photo
                    ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 22 }}>✂️</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...onboardingListTitleStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {cat.name}
                    {cat.services.some((s) => s.discountPercent) && (
                      <span style={onboardingDiscountBadgeStyle}>% скидки</span>
                    )}
                  </div>
                  <div style={onboardingListSubtitleStyle}>
                    {cat.services.length === 0
                      ? 'Нет услуг'
                      : `${cat.services.length} ${cat.services.length === 1 ? 'услуга' : cat.services.length < 5 ? 'услуги' : 'услуг'}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openCatForm(cat) }}
                    style={onboardingListActionButtonStyle}
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleDeleteCategory(cat.id) }}
                    style={{ ...onboardingListActionButtonStyle, color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 1 }}
                  >
                    ×
                  </button>
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                    style={{ flexShrink: 0, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
                  >
                    <path d="M6 9l6 6 6-6" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Услуги категории */}
              {expanded && (
                <div>
                  {cat.services.map((s) => {
                    const dPrice = discountedPrice(s.price, s.discountPercent)
                    return (
                      <button
                        key={s.id}
                        onClick={() => openSvcForm(s)}
                        style={{
                          ...onboardingListButtonStyle,
                          borderRadius: 0,
                          borderTop: '1px solid var(--color-border)',
                          alignItems: 'flex-start',
                          paddingLeft: 76,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={onboardingListTitleStyle}>{s.name}</div>
                          <div style={onboardingListSubtitleStyle}>{formatDuration(s.durationMin, s.durationMax)}</div>
                          <div style={onboardingPriceRowStyle}>
                            {dPrice !== null ? (
                              <>
                                <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>
                                  {formatPrice(dPrice)}
                                </span>
                                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>
                                  {formatPrice(s.price)}
                                </span>
                                <span style={onboardingDiscountBadgeStyle}>{s.discountPercent}% СКИДКА</span>
                              </>
                            ) : (
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{formatPrice(s.price)}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openSvcForm(s) }}
                            style={onboardingListActionButtonStyle}
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void handleDeleteService(s.id) }}
                            style={{ ...onboardingListActionButtonStyle, color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 1 }}
                          >
                            ×
                          </button>
                        </div>
                      </button>
                    )
                  })}

                  {/* Добавить услугу */}
                  <button
                    onClick={() => openSvcForm(undefined, cat.id)}
                    style={{
                      ...onboardingListButtonStyle,
                      borderRadius: 0,
                      borderTop: '1px solid var(--color-border)',
                      color: 'var(--color-primary)',
                      paddingLeft: 76,
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: 'var(--color-card2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>+</div>
                    Добавить услугу
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Добавить категорию */}
        <button
          onClick={() => openCatForm()}
          style={{ ...onboardingListCardStyle, ...onboardingListButtonStyle, borderRadius: 20 }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 24, background: 'var(--color-card2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: 'var(--color-text-secondary)', flexShrink: 0,
          }}>+</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={onboardingListTitleStyle}>Добавить категорию</div>
            <div style={onboardingListSubtitleStyle}>Пример: Стрижки и уход</div>
          </div>
        </button>

      </div>

      {/* ── Портал: Форма категории ── */}
      {showCatForm && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 4px 0', flexShrink: 0 }}>
            <button
              onClick={() => setShowCatForm(false)}
              style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }}
            >
              <BackArrowIcon />
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }}>
              {editCatId ? 'Редактирование категории' : 'Добавление категории'}
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
                style={{ ...stepOnePhotoButtonBaseStyle, cursor: catPhotoUploading ? 'default' : 'pointer' }}
              >
                {catPhotoPreview
                  ? <img src={catPhotoPreview} alt="Фото категории" style={stepOnePhotoPreviewStyle} />
                  : <img src={uploadIconUrl} alt="Загрузить фото" style={stepOnePhotoPlaceholderStyle} />
                }
                {catPhotoUploading && <UploadingOverlay />}
              </button>
              <input
                ref={catPhotoRef} type="file" accept="image/*" hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setCatPhotoPreview(URL.createObjectURL(file))
                  setCatPhotoUploading(true)
                  try {
                    const url = await uploadPhoto(file, 'categories')
                    setCatPhotoUrl(url)
                    setCatPhotoPreview(url)
                  } catch (err) {
                    console.error('Ошибка загрузки фото:', err)
                  } finally {
                    setCatPhotoUploading(false)
                  }
                }}
              />
            </div>

            <div style={onboardingFieldWrapStyle}>
              <input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Название"
                autoFocus
                style={onboardingFieldInputStyle}
              />
            </div>

            <div style={{ ...onboardingFieldWrapStyle, position: 'relative' }}>
              <div style={stepOneTextareaWrapStyle}>
                <textarea
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value.slice(0, 200))}
                  placeholder="Описание"
                  rows={3}
                  style={stepOneTextareaStyle}
                />
                <span style={stepOneCounterStyle}>{catDesc.length}/200</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
            <button
              type="button"
              disabled={!catName.trim() || catPhotoUploading}
              onClick={() => { void saveCatForm() }}
              style={{
                ...primaryActionButtonBaseStyle,
                cursor: !catName.trim() || catPhotoUploading ? 'default' : 'pointer',
                background: !catName.trim() || catPhotoUploading ? 'var(--color-card2)' : 'var(--color-primary)',
                color: !catName.trim() || catPhotoUploading ? 'var(--color-text-secondary)' : '#fff',
              }}
            >
              Готово
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Портал: Форма услуги ── */}
      {showSvcForm && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 4px 0', flexShrink: 0 }}>
            <button
              onClick={() => setShowSvcForm(false)}
              style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }}
            >
              <BackArrowIcon />
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }}>
              {editService ? 'Редактирование услуги' : 'Добавление услуги'}
            </div>
            <div style={{ width: 56 }} />
          </div>

          <div style={onboardingPortalContentStyle}>
            {/* Категория */}
            <div style={onboardingSelectWrapStyle}>
              <select
                value={svcCategoryId}
                onChange={(e) => setSvcCategoryId(e.target.value)}
                style={onboardingSelectStyle}
              >
                <option value="">Категория</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span style={onboardingSelectChevronStyle}>⌄</span>
            </div>

            <div style={onboardingFieldWrapStyle}>
              <input
                value={svcName}
                onChange={(e) => setSvcName(e.target.value)}
                placeholder="Название. Пример: Укладка волос"
                autoFocus
                style={onboardingFieldInputStyle}
              />
            </div>

            <div style={{ ...onboardingFieldWrapStyle, position: 'relative' }}>
              <div style={stepOneTextareaWrapStyle}>
                <textarea
                  value={svcDesc}
                  onChange={(e) => setSvcDesc(e.target.value.slice(0, 200))}
                  placeholder="Описание"
                  rows={3}
                  style={stepOneTextareaStyle}
                />
                <span style={stepOneCounterStyle}>{svcDesc.length}/200</span>
              </div>
            </div>

            <div style={onboardingFieldWithSuffixWrapStyle}>
              <input
                value={svcDuration}
                onChange={(e) => setSvcDuration(e.target.value.replace(/\D/g, ''))}
                placeholder="Продолжительность"
                inputMode="numeric"
                style={onboardingFieldInputStyle}
              />
              <span style={onboardingFieldSuffixStyle}>мин</span>
            </div>

            <div style={onboardingFieldWithSuffixWrapStyle}>
              <input
                value={svcPrice}
                onChange={(e) => setSvcPrice(e.target.value.replace(/[^\d.]/, ''))}
                placeholder="Стоимость"
                inputMode="decimal"
                style={onboardingFieldInputStyle}
              />
              <span style={onboardingFieldSuffixStyle}>₽</span>
            </div>

            {/* Скидка */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
              <Toggle checked={svcDiscountEnabled} onChange={setSvcDiscountEnabled} />
              <span style={onboardingToggleLabelStyle}>Скидка</span>
              {svcDiscountEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  <div style={{ ...onboardingSelectWrapStyle, width: 92 }}>
                    <select
                      value={svcDiscountPercent}
                      onChange={(e) => setSvcDiscountPercent(Number(e.target.value))}
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
              <div style={{ ...onboardingSectionLabelStyle, marginBottom: 8 }}>ПРИМЕРЫ РАБОТ</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => svcWorkPhotoRef.current?.click()}
                  disabled={svcWorkPhotoUploading}
                  style={{
                    width: 72, height: 72, borderRadius: 10, background: 'var(--color-card2)',
                    border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4,
                    opacity: svcWorkPhotoUploading ? 0.5 : 1,
                  }}
                >
                  {svcWorkPhotoUploading
                    ? <Spinner size={24} appearance="contrast" />
                    : <img src={maskIconUrl} alt="upload" style={serviceWorkPhotoAddIconStyle} />
                  }
                </button>

                {svcWorkPhotos.map((photo, i) => (
                  <div key={photo.id} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img
                      src={photo.previewUrl}
                      alt=""
                      style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }}
                    />
                    {photo.uploading && <UploadingOverlay />}
                    <button
                      onClick={() => setSvcWorkPhotos((prev) => prev.filter((_, j) => j !== i))}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--color-danger)', border: 'none',
                        color: '#fff', fontSize: 12, lineHeight: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: 0,
                      }}
                    >×</button>
                  </div>
                ))}

                <input
                  ref={svcWorkPhotoRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? [])
                    if (!files.length) return

                    const queued: LocalWorkPhoto[] = files.map((file, index) => ({
                      id: `work-photo-${Date.now()}-${index}`,
                      url: null,
                      previewUrl: URL.createObjectURL(file),
                      uploading: true,
                    }))

                    setSvcWorkPhotos((prev) => [...prev, ...queued])
                    setSvcWorkPhotoUploading(true)
                    try {
                      const results = await Promise.allSettled(files.map((file) => uploadPhoto(file, 'work')))
                      setSvcWorkPhotos((prev) => {
                        const uploadedById = new Map<string, string>()
                        const failedIds = new Set<string>()
                        results.forEach((result, index) => {
                          const photoId = queued[index]?.id
                          if (!photoId) return
                          if (result.status === 'fulfilled') uploadedById.set(photoId, result.value)
                          else failedIds.add(photoId)
                        })
                        return prev.flatMap((photo) => {
                          if (failedIds.has(photo.id)) return []
                          const url = uploadedById.get(photo.id)
                          if (!url) return [photo]
                          return [{ ...photo, url, previewUrl: url, uploading: false }]
                        })
                      })
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

          <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
            <button
              type="button"
              disabled={!svcName.trim() || svcWorkPhotoUploading}
              onClick={() => { void saveSvcForm() }}
              style={{
                ...primaryActionButtonBaseStyle,
                cursor: !svcName.trim() || svcWorkPhotoUploading ? 'default' : 'pointer',
                background: !svcName.trim() || svcWorkPhotoUploading ? 'var(--color-card2)' : 'var(--color-primary)',
                color: !svcName.trim() || svcWorkPhotoUploading ? 'var(--color-text-secondary)' : '#fff',
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 26, borderRadius: 13, border: 'none',
        background: checked ? 'var(--color-primary)' : 'var(--color-card)',
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

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke="#8E8E93" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="#8E8E93" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function BackArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

