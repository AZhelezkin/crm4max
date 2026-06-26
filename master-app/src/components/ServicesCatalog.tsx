import { text } from '@/styles/typography'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { categoriesApi, servicesApi } from '@/api/services.api'
import { useAuthStore } from '@/store/auth.store'
import type { Category, Service } from '@/types'
import { formatPrice, formatDuration, discountedPrice, UNCATEGORIZED_CATEGORY_ID } from '@/types'
import CategoryFormPortal from '@/components/CategoryFormPortal'
import ServiceFormPortal from '@/components/ServiceFormPortal'
import type { LocalWorkPhoto } from '@/lib/workPhotos'
import { getFirstUploadedWorkPhotoUrl } from '@/lib/workPhotos'
import {
  onboardingDiscountBadgeStyle,
  onboardingListActionButtonStyle,
  onboardingListButtonStyle,
  onboardingListCardStyle,
  onboardingListSubtitleStyle,
  onboardingListTitleStyle,
  onboardingPriceRowStyle,
} from '@/components/onboardingStepOne.styles'

// Три экрана: home (верхний блок + услуги) → categories (список категорий) → services (услуги категории).
export type CatalogSubStep = 'home' | 'categories' | 'services'

export interface ServicesCatalogHandle {
  subStep: CatalogSubStep
  selectedCatName: string
  categoryCount: number
  /** Назад на уровень выше. true — обработано внутри; false — уже на home (родитель выходит). */
  goBack: () => boolean
  /** Открыть список услуг без категории (deep-link с карточки мастера). */
  openUncategorized: () => void
}

interface ServicesCatalogProps {
  onSubStepChange?: (subStep: CatalogSubStep, catName?: string) => void
  onCategoryCountChange?: (count: number) => void
  /** Кнопка завершения (онбординг) — рендерится в конце контента home. */
  footer?: ReactNode
}

const ServicesCatalog = forwardRef<ServicesCatalogHandle, ServicesCatalogProps>(
  ({ onSubStepChange, onCategoryCountChange, footer }, ref) => {
    const [categories, setCategories] = useState<Category[]>([])
    const [allServices, setAllServices] = useState<Service[]>([])
    const [subStep, setSubStep] = useState<CatalogSubStep>('home')
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
    // Активный таб в секции «Услуги» на home: 'all' или id категории.
    const [activeServiceTab, setActiveServiceTab] = useState('all')
    // Данные загружены — чтобы не мигать «Добавить категорию» до прихода категорий.
    const [loaded, setLoaded] = useState(false)

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
    // Абонемент: тип записи и число приёмов (2..10). Цена/скидка — за один приём.
    const [svcIsPackage, setSvcIsPackage] = useState(false)
    const [svcSessionsCount, setSvcSessionsCount] = useState(2)
    const [svcWorkPhotos, setSvcWorkPhotos] = useState<LocalWorkPhoto[]>([])

    // Под-экраны (home/categories/services) живут в одном скролл-контейнере —
    // сбрасываем его прокрутку при переключении, иначе экран открывается «промотанным».
    const scrollRef = useRef<HTMLDivElement>(null)
    useEffect(() => { scrollRef.current?.scrollTo(0, 0) }, [subStep])

    const load = () =>
      Promise.all([categoriesApi.list(), servicesApi.list()]).then(([cats, svcs]) => {
        setCategories(cats)
        // Системную «Прочее» (isMisc) в редакторе услуг не показываем — она только
        // для записи на услугу не из каталога (см. CreateBookingPage).
        setAllServices(svcs.filter((s) => !s.isMisc))
        onCategoryCountChange?.(cats.length)
        setLoaded(true)
      }).catch(() => setLoaded(true))

    useEffect(() => { load() }, [])

    // Перезагрузка после мутаций: локальный список + master в auth-сторе
    // (ProfilePage читает master.categories из стора — без этого новые
    // категории/услуги не видны на главной до перезапуска мини-аппа).
    const reload = () => load().then(() => useAuthStore.getState().refreshMaster())

    // Услуги без категории — показываем в пустом состоянии (категорий ещё нет).
    const uncategorizedServices = allServices.filter((s) => !s.categoryId)

    const changeSubStep = (ss: CatalogSubStep, catName?: string) => {
      setSubStep(ss)
      onSubStepChange?.(ss, catName)
    }

    const isUncatStep = selectedCatId === UNCATEGORIZED_CATEGORY_ID

    useImperativeHandle(ref, () => ({
      subStep,
      selectedCatName: isUncatStep
        ? 'Услуги без категории'
        : categories.find((c) => c.id === selectedCatId)?.name ?? '',
      categoryCount: categories.length,
      goBack: () => {
        if (subStep === 'services') {
          // Услуги без категории открыты deep-link'ом с карточки → выходим назад (на профиль),
          // а не в список категорий, которого в этом потоке не было.
          if (isUncatStep) return false
          changeSubStep('categories'); return true
        }
        if (subStep === 'categories') { changeSubStep('home'); return true }
        return false
      },
      openUncategorized: () => {
        setSelectedCatId(UNCATEGORIZED_CATEGORY_ID)
        changeSubStep('services', 'Услуги без категории')
      },
    }), [subStep, categories, selectedCatId, isUncatStep])

    // ─── Категория ────────────────────────────────────────────────────────────

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
      // null (а не undefined) при очистке — иначе Prisma не обнуляет поле при редактировании.
      const data = { name: catName.trim(), description: catDesc || null, photo: catPhotoUrl || null }
      if (editCatId) await categoriesApi.update(editCatId, data)
      else await categoriesApi.create(data)
      setShowCatForm(false)
      reload()
    }

    const handleDeleteCategory = async (id: string) => {
      await categoriesApi.remove(id)
      if (id === selectedCatId) changeSubStep('categories')
      reload()
    }

    // Удаление из формы редактирования категории.
    const deleteCatForm = async () => {
      if (!editCatId) return
      // Если удаляемая категория была активным табом «Услуги» — сбрасываем на «Все»,
      // иначе таб укажет в никуда и список окажется пустым.
      if (activeServiceTab === editCatId) setActiveServiceTab('all')
      await categoriesApi.remove(editCatId)
      setShowCatForm(false)
      reload()
    }

    // ─── Услуга ───────────────────────────────────────────────────────────────

    const openSvcForm = (service?: Service, defaultCatId?: string) => {
      if (service) {
        setEditService(service)
        setSvcName(service.name)
        setSvcDesc(service.description ?? '')
        setSvcPrice(String(service.price / 100))
        setSvcDuration(String(service.duration))
        setSvcCategoryId(service.categoryId ?? '')
        setSvcDiscountEnabled(!!service.discountPercent)
        setSvcDiscountPercent(service.discountPercent ?? 10)
        setSvcIsPackage(service.sessionsCount > 1)
        setSvcSessionsCount(service.sessionsCount > 1 ? service.sessionsCount : 2)
        setSvcWorkPhotos(
          (service.workPhotos ?? []).map((p) => ({
            id: p.id, url: p.url, previewUrl: p.url, uploading: false,
          })),
        )
      } else {
        setEditService(null)
        setSvcName(''); setSvcDesc(''); setSvcPrice(''); setSvcDuration('')
        setSvcCategoryId(defaultCatId ?? '')
        setSvcDiscountEnabled(false); setSvcDiscountPercent(10)
        setSvcIsPackage(false); setSvcSessionsCount(2)
        setSvcWorkPhotos([])
      }
      setShowSvcForm(true)
    }

    const saveSvcForm = async () => {
      if (!svcName.trim()) return
      const firstPhotoUrl = getFirstUploadedWorkPhotoUrl(svcWorkPhotos)
      const data = {
        name: svcName.trim(),
        description: svcDesc || null,
        price: Math.round(Number(svcPrice) * 100) || 0,
        duration: Number(svcDuration) || 30,
        categoryId: svcCategoryId || null,
        // null (а не undefined) — чтобы при выключении скидки она обнулялась в БД
        // (Prisma игнорирует undefined и оставляет прежнее значение).
        discountPercent: svcDiscountEnabled ? svcDiscountPercent : null,
        sessionsCount: svcIsPackage ? svcSessionsCount : 1,
        photo: firstPhotoUrl || null,
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
      reload()
    }

    const handleDeleteService = async (id: string) => {
      await servicesApi.remove(id)
      reload()
    }

    const selectedCat = categories.find((c) => c.id === selectedCatId) ?? null

    // Табы секции «Услуги»: «Все» + по категории (счётчик = число услуг в ней).
    const serviceTabs = [
      { id: 'all', name: 'Все', count: allServices.length },
      ...categories.map((c) => ({ id: c.id, name: c.name, count: c.services.length })),
    ]
    const shownServices = activeServiceTab === 'all'
      ? allServices
      : (categories.find((c) => c.id === activeServiceTab)?.services ?? [])

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>

          {/* ── HOME: верхний блок (папка) + блок «УСЛУГИ» ── */}
          {subStep === 'home' && (
            <>
              {/* Верхний блок: нет категорий → CTA «Добавить категорию»; есть → сводка «Категории услуг».
                  До загрузки — резервируем высоту (72), чтобы не мигать CTA-карточкой и не дёргать секцию ниже. */}
              {!loaded ? (
                <div style={{ height: 76, flexShrink: 0 }} />
              ) : categories.length === 0 ? (
                <AddCategoryCard onClick={() => openCatForm()} />
              ) : (
                <CategoriesSummaryCard
                  count={categories.length}
                  onClick={() => changeSubStep('categories')}
                />
              )}

              {/* Блок «УСЛУГИ» (макет 8743:42301): заголовок секции + табы-категории + список услуг.
                  Карточка = имя + категория + chevron; тап → форма (удаление теперь там). */}
              <div style={{ marginTop: 8 }}>
                {/* sectionTitle pt16 pb4 px8 */}
                <div style={{ padding: '16px 8px 4px' }}>
                  <div style={{ ...text.caption3Caps, color: 'var(--color-on-surface)' }}>Услуги</div>
                </div>

                {/* Табы: «Все» + по категории; gap 32, px 24, горизонтальный скролл. */}
                <ServiceTabs tabs={serviceTabs} active={activeServiceTab} onChange={setActiveServiceTab} />

                {/* Карточки услуг выбранного таба (tabs→card 16, между карточками 8). */}
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {shownServices.map((s) => (
                    <ServiceListCard
                      key={s.id}
                      name={s.name}
                      categoryName={categories.find((c) => c.id === s.categoryId)?.name ?? 'Услуги без категории'}
                      onClick={() => openSvcForm(s)}
                    />
                  ))}
                  <AddRowButton label="Добавить услугу" onClick={() => openSvcForm(undefined)} />
                </div>
              </div>

              {footer && (
                <div style={{ paddingTop: 16, paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
                  {footer}
                </div>
              )}
            </>
          )}

          {/* ── CATEGORIES: список категорий (макет profile-category-list) ── */}
          {subStep === 'categories' && (
            <>
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  onClick={() => openCatForm(cat)}
                />
              ))}
              <div style={{ marginTop: 8 }}>
                <AddRowButton label="Добавить категорию" onClick={() => openCatForm()} />
              </div>
            </>
          )}

          {/* ── Список услуг категории (или услуг без категории при isUncatStep) ── */}
          {subStep === 'services' && (selectedCat || isUncatStep) && (
            <>
              {(selectedCat ? selectedCat.services : uncategorizedServices).map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  onEdit={() => openSvcForm(s)}
                  onDelete={() => { void handleDeleteService(s.id) }}
                />
              ))}

              <AddRowButton label="Добавить услугу" onClick={() => openSvcForm(undefined, selectedCat?.id)} />
            </>
          )}

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
          onDelete={editCatId ? () => { void deleteCatForm() } : undefined}
          serviceCount={categories.find((c) => c.id === editCatId)?.services.length ?? 0}
        />

        <ServiceFormPortal
          visible={showSvcForm}
          isEdit={!!editService}
          name={svcName}
          onNameChange={setSvcName}
          desc={svcDesc}
          onDescChange={setSvcDesc}
          duration={svcDuration}
          onDurationChange={setSvcDuration}
          price={svcPrice}
          onPriceChange={setSvcPrice}
          discountEnabled={svcDiscountEnabled}
          onDiscountEnabledChange={setSvcDiscountEnabled}
          discountPercent={svcDiscountPercent}
          onDiscountPercentChange={setSvcDiscountPercent}
          isPackage={svcIsPackage}
          onIsPackageChange={setSvcIsPackage}
          sessionsCount={svcSessionsCount}
          onSessionsCountChange={setSvcSessionsCount}
          workPhotos={svcWorkPhotos}
          onWorkPhotosChange={setSvcWorkPhotos}
          categories={categories.map((c) => ({ id: c.id, name: c.name, photo: c.photo }))}
          categoryId={svcCategoryId}
          onCategoryIdChange={setSvcCategoryId}
          onClose={() => setShowSvcForm(false)}
          onSave={() => { void saveSvcForm() }}
          onDelete={editService ? () => { void handleDeleteService(editService.id); setShowSvcForm(false) } : undefined}
        />
      </div>
    )
  },
)

ServicesCatalog.displayName = 'ServicesCatalog'
export default ServicesCatalog

// ─── Каталог: карточки и кнопки (макеты profile-services-empty / profile-category-list) ──

// Карточка h76 rx20 на surface-transparent — общая оболочка карточек каталога.
// flexShrink: 0 — иначе в скролл-контейнере (flex column) карточка сжимается ниже 76
// при обилии контента (home-экран), а на лёгком экране остаётся 76 → разная высота.
const catalogCardStyle: CSSProperties = {
  height: 76,
  flexShrink: 0,
  borderRadius: 20,
  border: 'none',
  cursor: 'pointer',
  background: 'var(--color-surface-transparent)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 20px',
  width: '100%',
}

// CTA-карточка «Добавить категорию» (пустое состояние): папка + центр-текст + шеврон.
function AddCategoryCard({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ ...catalogCardStyle, gap: 12 }}>
      <span style={{ color: 'var(--color-interactive-element-secondary)', display: 'flex', flexShrink: 0 }}>
        <FolderIcon />
      </span>
      <span style={{ flex: 1, textAlign: 'center', ...text.callout1, color: 'var(--color-on-surface)' }}>
        Добавить категорию
      </span>
      <span style={{ color: 'var(--color-interactive-element-secondary)', display: 'flex', flexShrink: 0 }}>
        <ChevronRightIcon />
      </span>
    </button>
  )
}

// Кол-во категорий со склонением: 1 категория / 2 категории / 5 категорий.
function catCountLabel(n: number): string {
  const m10 = n % 10, m100 = n % 100
  const word = m10 === 1 && m100 !== 11 ? 'категория'
    : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 'категории'
    : 'категорий'
  return `${n} ${word}`
}

// Верхний блок-сводка «Категории услуг» (макет listItem.svg): папка x32 + заголовок 16
// + счётчик 13 + шеврон. Тап → экран списка категорий.
function CategoriesSummaryCard({ count, onClick }: { count: number; onClick: () => void }) {
  // h76 (catalogCardStyle) по макету 8743:51031: чип 44 → 16px сверху/снизу, текст 40 центрируется.
  return (
    <button type="button" onClick={onClick} style={{ ...catalogCardStyle, gap: 12 }}>
      {/* Папка в чипе 44×44 (p10 rx12), как в макете 8743:51031 — не голая иконка. */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-interactive-element-secondary)',
      }}>
        <FolderIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Категории услуг
        </div>
        <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
          {catCountLabel(count)}
        </div>
      </div>
      <span style={{ color: 'var(--color-interactive-element-secondary)', display: 'flex', flexShrink: 0 }}>
        <ChevronRightIcon />
      </span>
    </button>
  )
}

// Карточка категории (список): аватар 44 + имя + описание (если есть) + шеврон.
function CategoryCard({ cat, onClick }: { cat: Category; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ ...catalogCardStyle, gap: 12, textAlign: 'left' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 22, overflow: 'hidden', flexShrink: 0,
        background: 'var(--color-secondary-surface)',
        color: 'var(--color-interactive-element-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {cat.photo
          ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <FolderIcon />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cat.name}
        </div>
        {cat.description && (
          <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {cat.description}
          </div>
        )}
      </div>
      <span style={{ color: 'var(--color-interactive-element-secondary)', display: 'flex', flexShrink: 0 }}>
        <ChevronRightIcon />
      </span>
    </button>
  )
}

// Компактная кнопка-строка «+ Добавить …»: h36 rx12 secondary-surface, «+» + текст.
function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', height: 36, flexShrink: 0, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: 'var(--color-secondary-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        color: 'var(--color-interactive-element-accented)',
      }}
    >
      <PlusIcon />
      <span style={{ ...text.callout2 }}>{label}</span>
    </button>
  )
}

// Карточка услуги (список услуг категории + услуги без категории в пустом состоянии).
function ServiceCard({ service: s, onEdit, onDelete }: {
  service: Service; onEdit: () => void; onDelete: () => void
}) {
  const dPrice = discountedPrice(s.price, s.discountPercent)
  return (
    <div onClick={onEdit} style={{ ...onboardingListCardStyle, cursor: 'pointer' }}>
      <div style={onboardingListButtonStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={onboardingListTitleStyle}>{s.name}</div>
          <div style={onboardingListSubtitleStyle}>{formatDuration(s.duration)}</div>
          <div style={onboardingPriceRowStyle}>
            {dPrice !== null ? (
              <>
                <span style={{ color: 'var(--color-primary-surface)', ...text.action }}>{formatPrice(dPrice)}</span>
                <span style={{ ...text.footnote, color: 'var(--color-on-surface-secondary)', textDecoration: 'line-through' }}>{formatPrice(s.price)}</span>
                <span style={onboardingDiscountBadgeStyle}>{s.discountPercent}% СКИДКА</span>
              </>
            ) : (
              <span style={{ ...text.action }}>{formatPrice(s.price)}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit() }} style={onboardingListActionButtonStyle}>
            <EditIcon />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            style={{ ...onboardingListActionButtonStyle, color: 'var(--color-on-surface-secondary)', ...text.titleSmall, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

// Табы секции «Услуги» (макет 8743:51857): «Все» + по категории, gap 32, px 24, гориз. скролл.
// Активный таб — active-element (label/counter-text/underline) + active-surface (counter bg);
// неактивный — on-surface-secondary + secondary-surface. Лейбл Body2, счётчик Caption2.
function ServiceTabs({ tabs, active, onChange }: {
  tabs: { id: string; name: string; count: number }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div style={{
      display: 'flex', gap: 32, overflowX: 'auto',
      // bleed до краёв экрана (родитель px16) + собственный px24 из макета.
      marginLeft: -16, marginRight: -16, padding: '0 24px',
      marginTop: 8, // sectionTitle-bottom(316) → tabs(324) = 8
      scrollbarWidth: 'none',
    }}>
      {tabs.map((t) => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, padding: '7px 0' }}>
              <span style={{
                ...text.body2, whiteSpace: 'nowrap',
                color: isActive ? 'var(--color-active-element)' : 'var(--color-on-surface-secondary)',
              }}>
                {t.name}
              </span>
              <span style={{
                minWidth: 24, padding: 3, borderRadius: 20, boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...text.caption2,
                background: isActive ? 'var(--color-active-surface)' : 'var(--color-secondary-surface)',
                color: isActive ? 'var(--color-active-element)' : 'var(--color-on-surface-secondary)',
              }}>
                {t.count}
              </span>
            </div>
            <div style={{
              width: '100%', height: 3, borderRadius: '20px 20px 0 0',
              background: isActive ? 'var(--color-active-element)' : 'transparent',
            }} />
          </button>
        )
      })}
    </div>
  )
}

// Карточка услуги в списке home (макет 8743:51800): имя (callout1) + категория (caption2) + chevron.
// Тап → форма редактирования (там же удаление). Без инлайн-цены/действий.
function ServiceListCard({ name, categoryName, onClick }: {
  name: string; categoryName: string; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', flexShrink: 0,
        background: 'var(--color-surface-transparent)', border: 'none', cursor: 'pointer',
        borderRadius: 20, padding: '16px 20px', textAlign: 'left',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {categoryName}
        </div>
      </div>
      <span style={{ color: 'var(--color-interactive-element-secondary)', display: 'flex', flexShrink: 0 }}>
        <ChevronRightIcon />
      </span>
    </button>
  )
}

// ─── Иконки ──────────────────────────────────────────────────────────────────

// Папка — оригинальный path из макета (нормализован viewBox под x48-68/y216-236).
function FolderIcon() {
  return (
    <svg width="24" height="24" viewBox="46 214 24 24" fill="none">
      <path d="M68 225V231C68 235 67 236 63 236H53C49 236 48 235 48 231V221C48 217 49 216 53 216H54.5C56 216 56.33 216.44 56.9 217.2L58.4 219.2C58.78 219.7 59 220 60 220H63C67 220 68 221 68 225Z" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4L10.5 8L6 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 8H12M8 4V12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke="var(--color-on-surface-secondary)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="var(--color-on-surface-secondary)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
