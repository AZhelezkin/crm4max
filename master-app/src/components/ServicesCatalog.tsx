import { text } from '@/styles/typography'
import { forwardRef, useEffect, useImperativeHandle, useState, type ReactNode } from 'react'
import { servicesApi } from '@/api/services.api'
import { useAuthStore } from '@/store/auth.store'
import type { Service } from '@/types'
import { formatPrice, formatDurationHuman, discountedPrice } from '@/types'
import ServiceEditorPortal, { type ServiceEditorTarget } from '@/components/ServiceEditorPortal'

export interface ServicesCatalogHandle {
  /** Назад на уровень выше. Плоский список — уровней нет, всегда false (родитель выходит). */
  goBack: () => boolean
  /** Совместимость со старым deep-link'ом «услуги без категории» — теперь no-op. */
  openUncategorized: () => void
  /** Открыть редактор создания услуги (кнопка «+» в шапке «Списка услуг»). */
  openCreate: () => void
  /** Показать/скрыть строку поиска (иконка «поиск» в шапке). */
  toggleSearch: () => void
}

interface ServicesCatalogProps {
  onServiceCountChange?: (count: number) => void
  /** Кнопка завершения (онбординг) — рендерится в конце контента. */
  footer?: ReactNode
  /** Скрыть нижнюю кнопку «Добавить услугу» — на «Списке услуг» добавление в шапке (+). */
  hideAddButton?: boolean
}

const ServicesCatalog = forwardRef<ServicesCatalogHandle, ServicesCatalogProps>(
  ({ onServiceCountChange, footer, hideAddButton = false }, ref) => {
    const [allServices, setAllServices] = useState<Service[]>([])
    // Открытый редактор услуги (создание/правка) — см. ServiceEditorPortal.
    const [editorTarget, setEditorTarget] = useState<ServiceEditorTarget | null>(null)
    // Поиск по названию (иконка в шапке «Списка услуг»).
    const [searchOpen, setSearchOpen] = useState(false)
    const [search, setSearch] = useState('')

    const load = () =>
      servicesApi.list().then((svcs) => {
        // Системную «Прочее» (isMisc) в редакторе услуг не показываем — она только
        // для записи на услугу не из каталога (см. CreateBookingPage).
        const shown = svcs.filter((s) => !s.isMisc)
        setAllServices(shown)
        onServiceCountChange?.(shown.length)
      }).catch(() => {})

    useEffect(() => { load() }, [])

    // Перезагрузка после мутаций: локальный список + master в auth-сторе
    // (ProfilePage читает услуги из стора — без этого новые услуги не видны
    // на главной до перезапуска мини-аппа).
    const reload = () => load().then(() => useAuthStore.getState().refreshMaster())

    useImperativeHandle(ref, () => ({
      goBack: () => false,
      openUncategorized: () => {},
      openCreate: () => setEditorTarget({ mode: 'create' }),
      toggleSearch: () => setSearchOpen((v) => { if (v) setSearch(''); return !v }),
    }), [])

    const q = search.trim().toLowerCase()
    const shownServices = q ? allServices.filter((s) => s.name.toLowerCase().includes(q)) : allServices

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>

          {/* Строка поиска (по иконке в шапке) */}
          {searchOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-transparent)', borderRadius: 12, padding: '10px 16px' }}>
              <span style={{ flexShrink: 0, display: 'inline-flex', color: 'var(--color-interactive-element-secondary)' }}><SearchIcon /></span>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск услуги"
                style={{ ...text.body2, flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-on-surface)', padding: 0 }}
              />
            </div>
          )}

          {/* Плоский список услуг (макет «Список услуг» 10304-43086): имя + длительность/цена + скидка; тап → форма. */}
          {shownServices.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              onEdit={() => setEditorTarget({ mode: 'edit', service: s })}
            />
          ))}

          {searchOpen && q && shownServices.length === 0 && (
            <div style={{ padding: '24px 12px', textAlign: 'center', ...text.caption1, color: 'var(--color-interactive-element-muted)' }}>
              Ничего не найдено
            </div>
          )}

          {!hideAddButton && (
            <AddRowButton label="Добавить услугу" onClick={() => setEditorTarget({ mode: 'create' })} />
          )}

          {footer && (
            <div style={{ paddingTop: 16, paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
              {footer}
            </div>
          )}

        </div>

        <ServiceEditorPortal
          target={editorTarget}
          onClose={() => setEditorTarget(null)}
          onSaved={reload}
        />
      </div>
    )
  },
)

ServicesCatalog.displayName = 'ServicesCatalog'
export default ServicesCatalog

// ─── Каталог: карточки и кнопки ───────────────────────────────────────────────

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

// Карточка услуги (макет 10304-43086): surface-transparent rx20 px20 py16;
// имя (Callout 1) + строка «длительность, цена [зачёркнутая]»; красный тег «-N%»; стрелка. Тап → редактор.
function ServiceCard({ service: s, onEdit }: { service: Service; onEdit: () => void }) {
  const dPrice = discountedPrice(s.price, s.discountPercent)
  const effective = dPrice ?? s.price
  return (
    <div
      onClick={onEdit}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--color-surface-transparent)', borderRadius: 20,
        padding: '16px 20px', cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...text.callout1, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {s.name}
        </span>
        <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formatDurationHuman(s.duration)}, {formatPrice(effective)}
          {dPrice !== null && (
            <span style={{ color: 'var(--color-on-surface-muted)', textDecoration: 'line-through', marginLeft: 6 }}>{formatPrice(s.price)}</span>
          )}
        </span>
      </div>
      {dPrice !== null && s.discountPercent && (
        <span style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px', borderRadius: 8, ...text.label2Caps,
          background: 'var(--color-error-surface-lite)', color: 'var(--color-on-error-surface-lite)',
        }}>
          -{s.discountPercent}%
        </span>
      )}
      <span style={{ flexShrink: 0, display: 'inline-flex', color: 'var(--color-interactive-element-secondary)' }}>
        <ArrowRightIcon />
      </span>
    </div>
  )
}

// ─── Иконки ──────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 8H12M8 4V12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/arrow-right (16×16).
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5.94 3.29 10.65 8l-4.71 4.71" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/search-normal (для строки поиска).
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M11.5 21a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM22 22l-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
