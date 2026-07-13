import { text } from '@/styles/typography'
import { forwardRef, useEffect, useImperativeHandle, useState, type ReactNode } from 'react'
import { servicesApi } from '@/api/services.api'
import { useAuthStore } from '@/store/auth.store'
import type { Service } from '@/types'
import { formatPrice, formatDuration, discountedPrice } from '@/types'
import ServiceEditorPortal, { type ServiceEditorTarget } from '@/components/ServiceEditorPortal'
import {
  onboardingDiscountBadgeStyle,
  onboardingListActionButtonStyle,
  onboardingListButtonStyle,
  onboardingListCardStyle,
  onboardingListSubtitleStyle,
  onboardingListTitleStyle,
  onboardingPriceRowStyle,
} from '@/components/onboardingStepOne.styles'

export interface ServicesCatalogHandle {
  /** Назад на уровень выше. Плоский список — уровней нет, всегда false (родитель выходит). */
  goBack: () => boolean
  /** Совместимость со старым deep-link'ом «услуги без категории» — теперь no-op. */
  openUncategorized: () => void
}

interface ServicesCatalogProps {
  onServiceCountChange?: (count: number) => void
  /** Кнопка завершения (онбординг) — рендерится в конце контента. */
  footer?: ReactNode
}

const ServicesCatalog = forwardRef<ServicesCatalogHandle, ServicesCatalogProps>(
  ({ onServiceCountChange, footer }, ref) => {
    const [allServices, setAllServices] = useState<Service[]>([])
    // Открытый редактор услуги (создание/правка) — см. ServiceEditorPortal.
    const [editorTarget, setEditorTarget] = useState<ServiceEditorTarget | null>(null)

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
    }), [])

    const handleDeleteService = async (id: string) => {
      await servicesApi.remove(id)
      reload()
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>

          {/* Плоский список всех услуг: имя + цена + длительность + скидка; тап → форма. */}
          {allServices.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              onEdit={() => setEditorTarget({ mode: 'edit', service: s })}
              onDelete={() => { void handleDeleteService(s.id) }}
            />
          ))}

          <AddRowButton label="Добавить услугу" onClick={() => setEditorTarget({ mode: 'create' })} />

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

// Карточка услуги (плоский список): имя + длительность + цена/скидка + edit/delete.
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

// ─── Иконки ──────────────────────────────────────────────────────────────────

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
