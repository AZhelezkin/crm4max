import { useEffect, useState } from 'react'
import { categoriesApi, servicesApi } from '@/api/services.api'
import type { Category, Service } from '@/types'
import { formatPrice, formatDuration, discountedPrice } from '@/types'
import PageHeader from '@/components/PageHeader'
import CategoryFormPortal from '@/components/CategoryFormPortal'
import ServiceFormPortal from '@/components/ServiceFormPortal'
import type { LocalWorkPhoto } from '@/lib/workPhotos'
import { getFirstUploadedWorkPhotoUrl } from '@/lib/workPhotos'
import {
  onboardingDiscountBadgeStyle,
  onboardingListActionButtonStyle,
  onboardingListButtonStyle,
  onboardingListCardStyle,
  onboardingListMediaStyle,
  onboardingListSubtitleStyle,
  onboardingListTitleStyle,
  onboardingPriceRowStyle,
} from '@/components/onboardingStepOne.styles'

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
                          alignItems: 'center',
                        }}
                      >
                        {/* Миниатюра первого примера работ */}
                        <div style={{
                          ...onboardingListMediaStyle,
                          borderRadius: 10,
                          flexShrink: 0,
                        }}>
                          {s.photo
                            ? <img src={s.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 20 }}>✂️</span>
                          }
                        </div>
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
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, background: 'var(--color-card2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, flexShrink: 0,
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

      <CategoryFormPortal
        visible={showCatForm}
        isEdit={!!editCatId}
        name={catName}
        onNameChange={setCatName}
        desc={catDesc}
        onDescChange={setCatDesc}
        photoPreview={catPhotoPreview}
        onPhotoPreview={setCatPhotoPreview}
        onPhotoUrl={setCatPhotoUrl}
        photoUploading={catPhotoUploading}
        onPhotoUploading={setCatPhotoUploading}
        onClose={() => setShowCatForm(false)}
        onSave={() => { void saveCatForm() }}
      />

      <ServiceFormPortal
        visible={showSvcForm}
        isEdit={!!editService}
        name={svcName}
        onNameChange={setSvcName}
        desc={svcDesc}
        onDescChange={setSvcDesc}
        durationMin={svcDuration}
        onDurationChange={setSvcDuration}
        price={svcPrice}
        onPriceChange={setSvcPrice}
        discountEnabled={svcDiscountEnabled}
        onDiscountEnabledChange={setSvcDiscountEnabled}
        discountPercent={svcDiscountPercent}
        onDiscountPercentChange={setSvcDiscountPercent}
        workPhotos={svcWorkPhotos}
        onWorkPhotosChange={setSvcWorkPhotos}
        categories={categories}
        categoryId={svcCategoryId}
        onCategoryIdChange={setSvcCategoryId}
        onClose={() => setShowSvcForm(false)}
        onSave={() => { void saveSvcForm() }}
      />
    </div>
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
