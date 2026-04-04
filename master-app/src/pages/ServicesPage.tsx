import { useEffect, useRef, useState } from 'react'
import { categoriesApi, servicesApi } from '@/api/services.api'
import { uploadPhoto } from '@/api/upload.api'
import type { Category, Service } from '@/types'
import { formatPrice, formatDuration, discountedPrice } from '@/types'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/Button'

const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50]

export default function ServicesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState<'category' | 'service' | null>(null)
  const [editService, setEditService] = useState<Service | null>(null)

  // Форма категории
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catPhotoPreview, setCatPhotoPreview] = useState<string | null>(null)
  const [catPhotoUrl, setCatPhotoUrl] = useState<string | null>(null)       // S3 URL
  const [catPhotoUploading, setCatPhotoUploading] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const catPhotoRef = useRef<HTMLInputElement>(null)

  // Форма услуги
  const [svcCategoryId, setSvcCategoryId] = useState('')
  const [svcName, setSvcName] = useState('')
  const [svcDesc, setSvcDesc] = useState('')
  const [svcPrice, setSvcPrice] = useState('')
  const [svcDuration, setSvcDuration] = useState('')
  const [svcDiscountEnabled, setSvcDiscountEnabled] = useState(false)
  const [svcDiscountPercent, setSvcDiscountPercent] = useState(10)

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
    setShowForm('category')
  }

  const handleSaveCategory = async () => {
    if (!catName.trim()) return
    const data = {
      name: catName.trim(),
      description: catDesc || undefined,
      photo: catPhotoUrl || undefined,
    }
    if (editCatId) {
      await categoriesApi.update(editCatId, data)
    } else {
      await categoriesApi.create(data)
    }
    setShowForm(null)
    load()
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Удалить категорию и все её услуги?')) return
    await categoriesApi.remove(id)
    load()
  }

  // ─── Услуга ─────────────────────────────────────────────────────────────────

  const openServiceForm = (service?: Service, defaultCatId?: string) => {
    if (service) {
      setEditService(service)
      setSvcName(service.name)
      setSvcDesc(service.description ?? '')
      setSvcPrice(String(service.price / 100))
      setSvcDuration(String(service.durationMin))
      setSvcCategoryId(service.categoryId ?? '')
      setSvcDiscountEnabled(!!service.discountPercent)
      setSvcDiscountPercent(service.discountPercent ?? 10)
    } else {
      setEditService(null)
      setSvcName(''); setSvcDesc(''); setSvcPrice(''); setSvcDuration('')
      setSvcCategoryId(defaultCatId ?? categories[0]?.id ?? '')
      setSvcDiscountEnabled(false); setSvcDiscountPercent(10)
    }
    setShowForm('service')
  }

  const handleSaveService = async () => {
    if (!svcName.trim()) return
    const data = {
      name: svcName.trim(),
      description: svcDesc || undefined,
      price: Math.round(Number(svcPrice) * 100) || 0,
      durationMin: Number(svcDuration) || 30,
      categoryId: svcCategoryId || undefined,
      discountPercent: svcDiscountEnabled ? svcDiscountPercent : undefined,
    }
    if (editService) {
      await servicesApi.update(editService.id, data)
    } else {
      await servicesApi.create(data)
    }
    setShowForm(null)
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
            <div key={cat.id} style={{ background: 'var(--color-card)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>

              {/* Заголовок категории — кликабельный */}
              <div
                onClick={() => toggleCat(cat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', cursor: 'pointer',
                  borderBottom: expanded ? '1px solid var(--color-border)' : 'none',
                }}
              >
                {/* Фото */}
                <div style={{
                  width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
                  background: 'var(--color-card2)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {cat.photo
                    ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 22 }}>✂️</span>
                  }
                </div>

                {/* Название */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {cat.name}
                    {cat.services.some((s) => s.discountPercent) && (
                      <span style={{
                        background: 'var(--color-danger)', color: '#fff',
                        fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                      }}>% скидки</span>
                    )}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 2 }}>
                    {cat.services.length} {cat.services.length === 1 ? 'услуга' : cat.services.length < 5 ? 'услуги' : 'услуг'}
                  </div>
                </div>

                {/* Действия: редактировать категорию, удалить */}
                <button
                  onClick={(e) => { e.stopPropagation(); openCatForm(cat) }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', padding: '4px 6px', cursor: 'pointer' }}
                >
                  <EditIcon />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id) }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', padding: '4px 6px', fontSize: 18, cursor: 'pointer' }}
                >
                  ✕
                </button>

                {/* Шеврон */}
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  style={{ flexShrink: 0, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
                >
                  <path d="M6 9l6 6 6-6" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Услуги категории — видны только когда раскрыт */}
              {expanded && (
                <div>
                  {cat.services.map((s) => {
                    const dPrice = discountedPrice(s.price, s.discountPercent)
                    return (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex', alignItems: 'center',
                          padding: '10px 14px 10px 70px',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 2 }}>
                            {formatDuration(s.durationMin, s.durationMax)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginRight: 8 }}>
                          {dPrice !== null ? (
                            <>
                              <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>{formatPrice(dPrice)}</div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>{formatPrice(s.price)}</div>
                              <div style={{ background: 'var(--color-danger)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '1px 5px' }}>
                                {s.discountPercent}% СКИДКА
                              </div>
                            </>
                          ) : (
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{formatPrice(s.price)}</div>
                          )}
                        </div>
                        <button
                          onClick={() => openServiceForm(s)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', padding: '4px 6px', cursor: 'pointer' }}
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDeleteService(s.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: 18, padding: '4px 6px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}

                  {/* Добавить услугу в категорию */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openServiceForm(undefined, cat.id) }}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px 10px 70px',
                      color: 'var(--color-primary)', fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: 'var(--color-card2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
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
          style={{
            width: '100%', background: 'var(--color-card)', border: 'none',
            borderRadius: 'var(--radius)', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: 'var(--color-card2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: 'var(--color-text-secondary)',
          }}>+</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 15, color: 'var(--color-text)', fontWeight: 500 }}>Добавить категорию</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 1 }}>Пример: Стрижки и уход</div>
          </div>
        </button>

      </div>

      {/* ── Боттом-шит: Категория ── */}
      {showForm === 'category' && (
        <BottomSheet
          title={editCatId ? 'Редактировать категорию' : 'Добавление категории'}
          onClose={() => setShowForm(null)}
        >
          {/* Фото */}
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
              {catPhotoPreview
                ? <>
                    <img src={catPhotoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {catPhotoUploading && <UploadingOverlay />}
                  </>
                : <CameraIcon />
              }
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
                } catch (err) {
                  console.error('Ошибка загрузки фото категории:', err)
                } finally {
                  setCatPhotoUploading(false)
                }
              }}
            />
          </div>

          <div style={{ background: 'var(--color-card2)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 12 }}>
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Название. Пример: Работа с волосами"
              style={{
                width: '100%', background: 'none', border: 'none',
                borderBottom: '1px solid var(--color-border)',
                padding: '14px 16px', fontSize: 15, color: 'var(--color-text)',
              }}
            />
            <div style={{ position: 'relative' }}>
              <input
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value.slice(0, 200))}
                placeholder="Описание. Пример: Укладка длинных волос"
                style={{
                  width: '100%', background: 'none', border: 'none',
                  padding: '14px 56px 14px 16px', fontSize: 15, color: 'var(--color-text)',
                }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {catDesc.length}/200
              </span>
            </div>
          </div>

          <Button onClick={handleSaveCategory} fullWidth disabled={!catName.trim() || catPhotoUploading}>
            {catPhotoUploading ? 'Загрузка фото...' : 'Готово'}
          </Button>
        </BottomSheet>
      )}

      {/* ── Боттом-шит: Услуга ── */}
      {showForm === 'service' && (
        <BottomSheet
          title={editService ? 'Редактирование услуги' : 'Добавление услуги'}
          onClose={() => setShowForm(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Категория */}
            <div style={{ position: 'relative' }}>
              <select
                value={svcCategoryId}
                onChange={(e) => setSvcCategoryId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Категория</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', pointerEvents: 'none', fontSize: 14 }}>⌄</span>
            </div>

            <input
              value={svcName}
              onChange={(e) => setSvcName(e.target.value)}
              placeholder="Название. Пример: Укладка волос"
              style={inputStyle}
            />

            <div style={{ position: 'relative' }}>
              <textarea
                value={svcDesc}
                onChange={(e) => setSvcDesc(e.target.value.slice(0, 200))}
                placeholder="Описание. Пример: Современные методы укладки волос без лака"
                rows={3}
                style={{ ...inputStyle, resize: 'none', paddingBottom: 28 }}
              />
              <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {svcDesc.length}/200
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={svcDuration}
                  onChange={(e) => setSvcDuration(e.target.value.replace(/\D/g, ''))}
                  placeholder="Продолжительность"
                  inputMode="numeric"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>МИН</span>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={svcPrice}
                  onChange={(e) => setSvcPrice(e.target.value.replace(/[^\d.]/, ''))}
                  placeholder="Стоимость"
                  inputMode="decimal"
                  style={{ ...inputStyle, paddingRight: 30 }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--color-text-secondary)' }}>₽</span>
              </div>
            </div>

            {/* Скидка */}
            <div style={{
              background: 'var(--color-card2)', borderRadius: 'var(--radius-sm)',
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Toggle checked={svcDiscountEnabled} onChange={setSvcDiscountEnabled} />
              <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>Скидка</span>
              {svcDiscountEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <select
                    value={svcDiscountPercent}
                    onChange={(e) => setSvcDiscountPercent(Number(e.target.value))}
                    style={{
                      background: 'var(--color-card)', border: 'none', borderRadius: 8,
                      padding: '8px 12px', fontSize: 15, color: 'var(--color-text)', cursor: 'pointer',
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
                {(editService?.workPhotos ?? []).map((p) => (
                  <div key={p.id} style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
                <button style={{
                  width: 72, height: 72, borderRadius: 10, background: 'var(--color-card2)',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CameraIcon size={36} />
                </button>
              </div>
            </div>

            <Button onClick={handleSaveService} fullWidth disabled={!svcName.trim()}>Готово</Button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── Вспомогательные компоненты ───────────────────────────────────────────────

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
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-card2)', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

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

function CameraIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" stroke="#8E8E93" strokeWidth="1.5" />
    </svg>
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
