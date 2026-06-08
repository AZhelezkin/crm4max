import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { categoriesApi, servicesApi } from '@/api/services.api'
import { bookingsApi } from '@/api/bookings.api'
import { mastersApi } from '@/api/masters.api'
import { useAuthStore } from '@/store/auth.store'
import type { Category, Service } from '@/types'
import { UNCATEGORIZED_CATEGORY_ID } from '@/types'
import { text } from '@/styles/typography'

const VIOLET_GRADIENT = 'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)'

interface CategoryItem {
  id: string
  name: string
  description: string | null
  photo: string | null
  hasDiscount: boolean
  isUncat: boolean
}

// Флоу создания записи мастером (макет 8746-41312):
// шаг «category» — выбор категории, шаг «details» — услуга/дата/время (форма; будет
// переверстана по следующим макетам флоу).
export default function CreateBookingPage() {
  const navigate = useNavigate()
  const master = useAuthStore((s) => s.master)

  const [step, setStep] = useState<'category' | 'details'>('category')
  const [categories, setCategories] = useState<Category[]>([])
  const [allServices, setAllServices] = useState<Service[]>([])
  const [loaded, setLoaded] = useState(false)
  // null — без фильтра по категории (вход через поиск)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([categoriesApi.list(), servicesApi.list()])
      .then(([cats, svcs]) => {
        setCategories(cats)
        setAllServices(svcs)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (master?.id && serviceId && date) {
      mastersApi.getSlots(master.id, date, serviceId).then(setSlots).catch(() => setSlots([]))
    } else {
      setSlots([])
    }
  }, [master?.id, serviceId, date])

  // Пункты списка категорий: свои категории + синтетическая «Без категории».
  const items = useMemo<CategoryItem[]>(() => {
    const uncategorized = allServices.filter((s) => s.categoryId == null)
    const list: CategoryItem[] = categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      photo: c.photo,
      hasDiscount: c.services.some((s) => s.discountPercent),
      isUncat: false,
    }))
    if (uncategorized.length) {
      list.push({
        id: UNCATEGORIZED_CATEGORY_ID,
        name: 'Без категории',
        description: null,
        photo: null,
        hasDiscount: uncategorized.some((s) => s.discountPercent),
        isUncat: true,
      })
    }
    return list
  }, [categories, allServices])

  // Услуги для шага «details», отфильтрованные по выбранной категории.
  const detailServices = useMemo<Service[]>(() => {
    if (selectedCategoryId == null) return allServices
    if (selectedCategoryId === UNCATEGORIZED_CATEGORY_ID) return allServices.filter((s) => s.categoryId == null)
    return allServices.filter((s) => s.categoryId === selectedCategoryId)
  }, [allServices, selectedCategoryId])

  const openCategory = (id: string) => {
    setSelectedCategoryId(id)
    setServiceId('')
    setTime('')
    setStep('details')
  }

  // Поиск: пока ведёт к шагу «details» по всем услугам (отдельный экран поиска — в следующих макетах).
  const openSearch = () => {
    setSelectedCategoryId(null)
    setServiceId('')
    setTime('')
    setStep('details')
  }

  const handleSave = async () => {
    if (!master || !serviceId || !date || !time) return
    setSaving(true)
    try {
      await bookingsApi.create({ masterId: master.id, serviceId, date, time })
      navigate('/bookings')
    } finally {
      setSaving(false)
    }
  }

  // ─── Шаг 1: выбор категории (макет 8746-41312) ──────────────────────────────
  if (step === 'category') {
    return (
      <div style={{ minHeight: '100dvh', paddingBottom: 20 }}>
        <Toolbar
          title="Выберите категорию"
          onBack={() => navigate(-1)}
          trailing={
            <PillButton onClick={openSearch} ariaLabel="Поиск">
              <SearchIcon />
            </PillButton>
          }
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 16px' }}>
          {loaded && items.length === 0 && (
            <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
              Сначала добавьте услуги в профиле
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openCategory(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--color-surface-transparent)',
                borderRadius: 20,
                padding: '16px 20px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <CategoryAvatar photo={item.photo} uncategorized={item.isUncat} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      ...text.callout1,
                      color: 'var(--color-on-surface)',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </span>
                  {item.hasDiscount && (
                    <span
                      style={{
                        flexShrink: 0,
                        height: 20,
                        padding: '0 6px',
                        boxSizing: 'border-box',
                        borderRadius: 4,
                        background: 'var(--color-error-surface-lite)',
                        color: 'var(--color-on-error-surface-lite)',
                        ...text.label3Caps,
                        lineHeight: '20px',
                      }}
                    >
                      % скидки
                    </span>
                  )}
                </div>
                {item.description && (
                  <div
                    style={{
                      ...text.caption2,
                      color: 'var(--color-on-surface-secondary)',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                      overflow: 'hidden',
                    }}
                  >
                    {item.description}
                  </div>
                )}
              </div>
              <ArrowRightIcon />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Шаг 2: услуга / дата / время (интерим-форма) ───────────────────────────
  return (
    <div style={{ minHeight: '100dvh' }}>
      <Toolbar title="Создать запись" onBack={() => setStep('category')} />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ ...text.footnote, color: 'var(--color-on-surface-secondary)', marginBottom: 6, fontWeight: 500 }}>Услуга</div>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-divider-low)', ...text.body }}
          >
            <option value="">Выберите услугу</option>
            {detailServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.duration} мин
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ ...text.footnote, color: 'var(--color-on-surface-secondary)', marginBottom: 6, fontWeight: 500 }}>Дата</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--color-divider-low)', ...text.body }}
          />
        </div>

        {slots.length > 0 && (
          <div>
            <div style={{ ...text.footnote, color: 'var(--color-on-surface-secondary)', marginBottom: 6, fontWeight: 500 }}>Время</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTime(s)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    ...text.bodyMedium,
                    background: time === s ? 'var(--color-primary-surface)' : 'var(--color-surface)',
                    color: time === s ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)',
                    border: '1px solid var(--color-divider-low)',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={saving || !serviceId || !date || !time}
          onClick={() => { void handleSave() }}
          style={{
            width: '100%',
            height: 60,
            marginTop: 8,
            borderRadius: 20,
            border: 'none',
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...text.callout1,
            cursor: saving || !serviceId || !date || !time ? 'default' : 'pointer',
            background: saving || !serviceId || !date || !time ? 'var(--color-secondary-surface-muted)' : 'var(--color-primary-surface)',
            color: saving || !serviceId || !date || !time ? 'var(--color-interactive-element-muted)' : 'var(--color-on-primary-surface)',
          }}
        >
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

// ─── Тулбар: назад-пилюля слева, заголовок по центру, опц. trailing справа ────
function Toolbar({ title, onBack, trailing }: { title: string; onBack: () => void; trailing?: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px' }}>
      <PillButton onClick={onBack} ariaLabel="Назад">
        <ArrowLeftIcon />
      </PillButton>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
          ...text.callout1,
          color: 'var(--color-on-surface)',
        }}
      >
        {title}
      </div>
      {trailing ?? <div style={{ width: 44 }} />}
    </div>
  )
}

// Пилюля-кнопка тулбара: bg background, r22, p4 + внутренняя кнопка p6 с иконкой 24.
function PillButton({ onClick, ariaLabel, children }: { onClick: () => void; ariaLabel: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-background)', borderRadius: 22, flexShrink: 0 }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface)' }}
      >
        {children}
      </button>
    </div>
  )
}

// Аватар категории 44: фото; иначе фолдер (фиолетовый градиент для «Без категории», surface для остальных).
function CategoryAvatar({ photo, uncategorized }: { photo: string | null; uncategorized: boolean }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        flexShrink: 0,
        overflow: 'hidden',
        background: photo ? 'var(--color-surface)' : uncategorized ? VIOLET_GRADIENT : 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photo ? (
        <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <FolderIcon color={uncategorized ? '#FFFFFF' : 'var(--color-on-surface-secondary)'} />
      )}
    </div>
  )
}

// vuesax/linear/folder (20×20).
function FolderIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M18.3333 9.16667V14.1667C18.3333 17.5 17.5 18.3333 14.1667 18.3333H5.83333C2.5 18.3333 1.66667 17.5 1.66667 14.1667V5.83333C1.66667 2.5 2.5 1.66667 5.83333 1.66667H7.08333C8.33333 1.66667 8.60833 2.03333 9.08333 2.66667L10.3333 4.33333C10.65 4.75 10.8333 5 11.6667 5H14.1667C17.5 5 18.3333 5.83333 18.3333 9.16667Z"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11.5 21c5.246 0 9.5-4.254 9.5-9.5S16.746 2 11.5 2 2 6.254 2 11.5 6.254 21 11.5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m22 22-2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5.5 3L10.5 8L5.5 13" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
