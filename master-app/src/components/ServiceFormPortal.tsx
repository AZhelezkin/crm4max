import { text } from '@/styles/typography'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { uploadPhoto } from '@/api/upload.api'
import type { LocalWorkPhoto } from '@/lib/workPhotos'
import { formatPrice } from '@/types'
import { HeroHeader, FloatingField, UploadingOverlay } from '@/components/onboardingShared'
import ToggleSwitch from '@/components/ToggleSwitch'
import WheelPicker from '@/components/WheelPicker'

export interface ServiceFormCategoryItem {
  id: string
  name: string
  photo?: string | null
}

interface Props {
  visible: boolean
  isEdit: boolean
  name: string
  onNameChange: (v: string) => void
  desc: string
  onDescChange: (v: string) => void
  duration: string
  onDurationChange: (v: string) => void
  price: string
  onPriceChange: (v: string) => void
  discountEnabled: boolean
  onDiscountEnabledChange: (v: boolean) => void
  discountPercent: number
  onDiscountPercentChange: (v: number) => void
  /** Тип записи: false — одиночная, true — абонемент (курс из N приёмов). */
  isPackage: boolean
  onIsPackageChange: (v: boolean) => void
  /** Число приёмов в абонементе (2..10). Цена/скидка указываются за один приём. */
  sessionsCount: number
  onSessionsCountChange: (v: number) => void
  /** Фото работ. Компонент обновляет этот массив при загрузке/удалении. */
  workPhotos: LocalWorkPhoto[]
  onWorkPhotosChange: (photos: LocalWorkPhoto[]) => void
  categories?: ServiceFormCategoryItem[]
  categoryId?: string
  onCategoryIdChange?: (v: string) => void
  onClose: () => void
  onSave: () => void
  /** Удаление услуги (только в режиме редактирования) — двойной тап. */
  onDelete?: () => void
  /** Открыть справочник популярных услуг (тап по «Выбрать из популярных»). */
  onPickPopular?: () => void
}

// Варианты длительности приёма (минуты).
// Минимум 10 минут: шаг слотов для клиента равен длительности услуги, поэтому
// короткие услуги порождали слоты «каждую минуту» (бэкенд валидирует то же значение).
const DURATION_OPTIONS = [10, 15, 30, 45, 60, 90, 120, 150, 180, 240]

// Число приёмов в абонементе — от 2 до 10.
const SESSIONS_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

function formatDur(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m} мин`
  const hWord = h === 1 ? 'час' : h < 5 ? 'часа' : 'часов'
  return m === 0 ? `${h} ${hWord}` : `${h} ч ${m} мин`
}

// ─── Стили (значения из Figma profile-service-create, Nunito Sans) ─────────────

// Пилюля h72 rx20 на surface-transparent.
const pillFieldStyle: CSSProperties = {
  position: 'relative',
  height: 72,
  borderRadius: 20,
  background: 'var(--color-surface-transparent)',
  padding: '0 44px 0 20px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

// Тайтл строки/пикера — Callout 1 17/700/-0.17 (Bold), on-surface.
const pickerTitleStyle: CSSProperties = { ...text.callout1, color: 'var(--color-on-surface)' }
// Подзаголовок — Caption 2 14/500/-0.028, on-surface-secondary.
const pickerSubtitleStyle: CSSProperties = { ...text.caption2, color: 'var(--color-on-surface-secondary)', marginTop: 2 }

const chevronStyle: CSSProperties = {
  position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
  pointerEvents: 'none', display: 'flex', color: 'var(--color-interactive-element-secondary)',
}

// Тайл «добавить фото» — pattern-element фон, камера по центру (rx20).
const addPhotoTileStyle: CSSProperties = {
  borderRadius: 20,
  border: 'none',
  background: 'var(--color-pattern-element)',
  color: 'var(--color-interactive-element-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

// Подпись секции — Caption 3 CAPS 14/500/0.42 uppercase. Обёртка pt16 pb4 px8 (Figma sectionTitle).
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '16px 8px 4px' }}>
      <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface)' }}>{children}</span>
    </div>
  )
}

// Создание/редактирование услуги (Figma node 8743:53223 profile-service-create).
// Контент: gap 24 между группами; внутри групп gap 8; поля h72 / описание h120 / листы h76/h72.
export default function ServiceFormPortal({
  visible, isEdit,
  name, onNameChange,
  desc, onDescChange,
  duration, onDurationChange,
  price, onPriceChange,
  discountEnabled, onDiscountEnabledChange,
  discountPercent, onDiscountPercentChange,
  isPackage, onIsPackageChange,
  sessionsCount, onSessionsCountChange,
  workPhotos, onWorkPhotosChange,
  categories, categoryId, onCategoryIdChange,
  onClose, onSave, onDelete, onPickPopular,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Открытый picker (категория/длительность/число приёмов) — колесо вместо нативного <select>.
  const [openPicker, setOpenPicker] = useState<'category' | 'duration' | 'sessions' | null>(null)
  // Сбрасываем подтверждение удаления при закрытии формы.
  useEffect(() => { if (!visible) setConfirmDelete(false) }, [visible])
  // Взвели удаление корзиной вверху — подкручиваем к кнопке «Подтвердите удаление» внизу.
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (confirmDelete) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [confirmDelete])

  if (!visible) return null

  const canSave = !!name.trim() && !uploading
  const durationMin = Number(duration) || 0
  const selectedCat = categories?.find((c) => c.id === categoryId) ?? null
  const discountedNum = discountEnabled && price
    ? Math.round(Number(price) * 100 * (1 - discountPercent / 100))
    : null

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--gradient-hero-background)',
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      zIndex: 200,
      display: 'flex', flexDirection: 'column',
    }}>
      <HeroHeader
        title={isEdit ? 'Редактирование услуги' : 'Создание услуги'}
        onBack={onClose}
        trailing={onDelete ? (
          // Удаление — иконка-корзина в тулбаре (макет 10304-43249). Тап взводит
          // подтверждение (кнопка «Подтвердите удаление» снизу); повторный тап — отбой.
          <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: confirmDelete ? 'var(--color-error-surface-lite)' : 'var(--color-background)', borderRadius: 22 }}>
            <button
              type="button"
              aria-label="Удалить услугу"
              onClick={() => setConfirmDelete((v) => !v)}
              style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', color: 'var(--color-error-surface-accented)' }}
            >
              <TrashIcon />
            </button>
          </div>
        ) : undefined}
      />

      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto',
        padding: '8px 16px calc(48px + env(safe-area-inset-bottom))',
      }}>
        {/* Контент — во внутренней content-height flex-колонке. Внешний контейнер блочный,
            иначе flex-shrink сжимает fixed-height пилюли/кнопки при переполнении формы. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Тип записи — segment-control «Одиночная / Абонемент» (Figma 9762:65203). */}
        <BookingModeTabs isPackage={isPackage} onChange={onIsPackageChange} />

        {/* Количество приёмов — только в абонементе, пикер 2..10 (Figma 9762:65447). */}
        {isPackage && (
          <button
            type="button"
            onClick={() => setOpenPicker('sessions')}
            style={{ ...pillFieldStyle, border: 'none', cursor: 'pointer', textAlign: 'left', alignItems: 'flex-start' }}
          >
            <span style={pickerTitleStyle}>Количество приёмов</span>
            <span style={pickerSubtitleStyle}>{sessionsCount}</span>
            <span style={chevronStyle}><ChevronRightIcon /></span>
          </button>
        )}

        {/* Группа: Выбор из популярных + Название + Описание (gap 8) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* «Выбрать из популярных» → справочник (и при создании, и при редактировании — макет 10130-51982). */}
          {onPickPopular && (
            <button
              type="button"
              onClick={onPickPopular}
              style={{
                borderRadius: 20, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                background: 'var(--color-surface-transparent)',
                display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
              }}
            >
              <span style={{ ...text.body2, color: 'var(--color-primary-surface)', flex: 1 }}>Выбрать из популярных</span>
              <span style={{ color: 'var(--color-primary-surface)', display: 'flex', flexShrink: 0 }}><ChevronRightIcon /></span>
            </button>
          )}
          {/* Автофокус — только при создании услуги; в редактировании он лишний
              (сразу открывалась клавиатура и экран уезжал вверх). */}
          <FloatingField label="Название услуги" value={name} onChange={onNameChange} autoFocus={!isEdit} />
          <FloatingField
            label="Описание"
            value={desc}
            onChange={(v) => onDescChange(v.slice(0, 200))}
            multiline minHeight={120} align="top" rows={3} maxLength={200}
          />
        </div>

        {/* Группа: Время приёма */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionTitle>Время приёма</SectionTitle>
          <button type="button" onClick={() => setOpenPicker('duration')} style={{ ...pillFieldStyle, border: 'none', cursor: 'pointer', textAlign: 'left', alignItems: 'flex-start' }}>
            <span style={pickerTitleStyle}>Продолжительность</span>
            <span style={pickerSubtitleStyle}>{durationMin > 0 ? formatDur(durationMin) : 'Не выбрано'}</span>
            <span style={chevronStyle}><ChevronRightIcon /></span>
          </button>
        </div>

        {/* Группа: Стоимость за приём */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionTitle>Стоимость за приём</SectionTitle>
          <FloatingField
            label="Стоимость"
            value={price}
            onChange={(v) => onPriceChange(v.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            suffix="₽"
          />
          {/* Скидка */}
          <div style={{
            height: 72, borderRadius: 20, background: 'var(--color-surface-transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
          }}>
            <span style={pickerTitleStyle}>Скидка</span>
            <ToggleSwitch checked={discountEnabled} onChange={onDiscountEnabledChange} aria-label="Скидка" />
          </div>

          {discountEnabled && (
            <>
              <FloatingField
                label="Проценты"
                value={String(discountPercent || '')}
                onChange={(v) => onDiscountPercentChange(Math.min(100, Number(v.replace(/\D/g, '')) || 0))}
                inputMode="numeric"
                suffix="%"
              />
              {/* Итого — пилюля с бордером */}
              <div style={{
                height: 39, borderRadius: 19.5, border: '1px solid var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
              }}>
                <span style={{ ...text.body, color: 'var(--color-on-surface-secondary)' }}>Итого</span>
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
                  {discountedNum !== null ? formatPrice(discountedNum) : '—'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Группа: Примеры работ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionTitle>Примеры работ</SectionTitle>
          {workPhotos.length === 0 ? (
            // Пусто — один тайл 138×170 (Figma media)
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ ...addPhotoTileStyle, width: 138, aspectRatio: '138 / 170', cursor: uploading ? 'default' : 'pointer' }}
              >
                <CameraIcon />
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {workPhotos.map((photo, i) => (
                <div key={photo.id} style={{ position: 'relative', aspectRatio: '121 / 170', borderRadius: 20, overflow: 'hidden' }}>
                  <img src={photo.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {photo.uploading && <UploadingOverlay />}
                  <button
                    type="button"
                    aria-label="Удалить фото"
                    onClick={() => onWorkPhotosChange(workPhotos.filter((_, j) => j !== i))}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 36, height: 36, borderRadius: 12, border: 'none', padding: 0,
                      background: 'var(--color-secondary-surface)', color: 'var(--color-on-surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ ...addPhotoTileStyle, aspectRatio: '121 / 170', cursor: uploading ? 'default' : 'pointer' }}
              >
                <CameraIcon />
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? [])
              if (!files.length) return
              const queued: LocalWorkPhoto[] = files.map((file, idx) => ({
                id: `work-photo-${Date.now()}-${idx}`,
                url: null,
                previewUrl: URL.createObjectURL(file),
                uploading: true,
              }))
              onWorkPhotosChange([...workPhotos, ...queued])
              setUploading(true)
              try {
                const results = await Promise.allSettled(files.map((file) => uploadPhoto(file, 'work')))
                onWorkPhotosChange(
                  [...workPhotos, ...queued].flatMap((photo) => {
                    const idx = queued.findIndex((q) => q.id === photo.id)
                    if (idx === -1) return [photo]
                    const result = results[idx]
                    if (!result || result.status === 'rejected') return []
                    return [{ ...photo, url: result.value, previewUrl: result.value, uploading: false }]
                  }),
                )
              } catch (err) {
                console.error('Ошибка загрузки фото работ:', err)
              } finally {
                setUploading(false)
                e.target.value = ''
              }
            }}
          />
        </div>

        {/* Кнопка «Сохранить» — в конце контента (скроллится вместе с ним, не прибита к низу). */}
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          style={{
            width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18, marginTop: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...text.callout1,
            cursor: canSave ? 'pointer' : 'default',
            background: canSave ? 'var(--color-primary-surface)' : 'var(--color-secondary-surface-muted)',
            color: canSave ? 'var(--color-on-primary-surface)' : 'var(--color-interactive-element-muted)',
          }}
        >
          Сохранить
        </button>

        {/* Подтверждение удаления — появляется после тапа по корзине в тулбаре.
            Сам механизм подтверждения оставлен прежним (тап по «Подтвердите удаление»). */}
        {onDelete && confirmDelete && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              width: '100%', height: 48, marginTop: 8, border: 'none', borderRadius: 20,
              ...text.callout1, cursor: 'pointer',
              background: 'rgba(209, 50, 50, 0.12)',
              color: 'var(--color-error-surface-accented)',
            }}
          >
            Подтвердите удаление
          </button>
        )}
        </div>
      </div>

      {/* Типовые колёса выбора (вместо нативного <select>). */}
      <WheelPicker
        open={openPicker === 'duration'}
        value={duration}
        options={DURATION_OPTIONS.map((m) => ({ value: String(m), label: formatDur(m) }))}
        onSelect={onDurationChange}
        onClose={() => setOpenPicker(null)}
      />
      <WheelPicker
        open={openPicker === 'sessions'}
        value={String(sessionsCount)}
        options={SESSIONS_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
        onSelect={(v) => onSessionsCountChange(Number(v))}
        onClose={() => setOpenPicker(null)}
      />
    </div>,
    document.body,
  )
}

// Segment-control «Одиночная / Абонемент» (Figma 9762:65203).
// Контейнер h44 p4 rx16 surface-transparent gap4; кнопки flex-1 h36 rx12.
// Активная — secondary-surface + interactive-element-accented (#F2F2F5);
// неактивная — прозрачная + interactive-element (#BCBECC). Текст Callout 2.
function BookingModeTabs({ isPackage, onChange }: { isPackage: boolean; onChange: (v: boolean) => void }) {
  const tabs = [
    { label: 'Одиночная', active: !isPackage, on: () => onChange(false) },
    { label: 'Абонемент', active: isPackage, on: () => onChange(true) },
  ]
  return (
    <div style={{
      display: 'flex', gap: 4, height: 44, alignItems: 'center', padding: 4,
      borderRadius: 16, background: 'var(--color-surface-transparent)', width: '100%',
    }}>
      {tabs.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={t.on}
          style={{
            flex: 1, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...text.callout2,
            background: t.active ? 'var(--color-secondary-surface)' : 'transparent',
            color: t.active ? 'var(--color-interactive-element-accented)' : 'var(--color-interactive-element)',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Иконки ──────────────────────────────────────────────────────────────────

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

// vuesax/linear/trash — удаление услуги (тулбар).
function TrashIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21 5.98c-3.33-.33-6.68-.5-10.02-.5-1.98 0-3.96.1-5.94.3L3 5.98" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 4.97l.22-1.31C8.88 2.71 9 2 10.69 2h2.62c1.69 0 1.82.75 1.97 1.67l.22 1.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.85 9.14l-.65 10.07C18.09 20.78 18 22 15.21 22H8.79C6 22 5.91 20.78 5.8 19.21L5.15 9.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.33 16.5h3.33M9.5 12.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Камера 45px (Figma camera, vuesax/linear).
function CameraIcon() {
  return (
    <svg width="45" height="45" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5C3 8.4 3.9 7.5 5 7.5H6.5L7.4 5.9C7.6 5.5 8 5.2 8.5 5.2H15.5C16 5.2 16.4 5.5 16.6 5.9L17.5 7.5H19C20.1 7.5 21 8.4 21 9.5V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12.8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
