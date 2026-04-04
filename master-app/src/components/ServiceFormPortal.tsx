import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Spinner, Switch } from '@maxhub/max-ui'
import { uploadPhoto } from '@/api/upload.api'
import maskIconUrl from '@/assets/mask-icon.svg'
import type { LocalWorkPhoto } from '@/lib/workPhotos'
import {
  onboardingDiscountBadgeStyle,
  onboardingFieldInputStyle,
  onboardingFieldSuffixStyle,
  onboardingFieldWithSuffixWrapStyle,
  onboardingFieldWrapStyle,
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
  stepOneTextareaStyle,
  stepOneTextareaWrapStyle,
} from '@/components/onboardingStepOne.styles'
import { formatPrice } from '@/types'

const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50]

export interface ServiceFormCategoryItem {
  id: string
  name: string
}

interface Props {
  visible: boolean
  isEdit: boolean
  name: string
  onNameChange: (v: string) => void
  desc: string
  onDescChange: (v: string) => void
  durationMin: string
  onDurationChange: (v: string) => void
  price: string
  onPriceChange: (v: string) => void
  discountEnabled: boolean
  onDiscountEnabledChange: (v: boolean) => void
  discountPercent: number
  onDiscountPercentChange: (v: number) => void
  /** Фото работ. Компонент обновляет этот массив при загрузке/удалении. */
  workPhotos: LocalWorkPhoto[]
  onWorkPhotosChange: (photos: LocalWorkPhoto[]) => void
  /** Если передано — показывается селект категории */
  categories?: ServiceFormCategoryItem[]
  categoryId?: string
  onCategoryIdChange?: (v: string) => void
  onClose: () => void
  onSave: () => void
}

export default function ServiceFormPortal({
  visible, isEdit,
  name, onNameChange,
  desc, onDescChange,
  durationMin, onDurationChange,
  price, onPriceChange,
  discountEnabled, onDiscountEnabledChange,
  discountPercent, onDiscountPercentChange,
  workPhotos, onWorkPhotosChange,
  categories, categoryId, onCategoryIdChange,
  onClose, onSave,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  if (!visible) return null

  const canSave = name.trim() && !uploading

  // Предпросмотр скидки
  const discountedPriceNum =
    discountEnabled && price
      ? Math.round(Number(price) * 100 * (1 - discountPercent / 100))
      : null

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--color-bg)',
      zIndex: 200,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Шапка */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 4px 0', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{
            width: 56, display: 'flex', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-primary)', padding: 0,
          }}
        >
          <BackArrowIcon />
        </button>
        <div style={{
          flex: 1, textAlign: 'center',
          fontSize: 20, fontWeight: 600,
          color: 'var(--color-text)', letterSpacing: -0.3,
        }}>
          {isEdit ? 'Редактирование услуги' : 'Добавление услуги'}
        </div>
        <div style={{ width: 56 }} />
      </div>

      {/* Контент */}
      <div style={onboardingPortalContentStyle}>
        {/* Название */}
        <div style={onboardingFieldWrapStyle}>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Название. Пример: Укладка волос"
            autoFocus
            style={onboardingFieldInputStyle}
          />
        </div>

        {/* Описание */}
        <div style={{ ...onboardingFieldWrapStyle, position: 'relative' }}>
          <div style={stepOneTextareaWrapStyle}>
            <textarea
              value={desc}
              onChange={(e) => onDescChange(e.target.value.slice(0, 200))}
              placeholder="Описание"
              rows={3}
              style={stepOneTextareaStyle}
            />
            <span style={stepOneCounterStyle}>{desc.length}/200</span>
          </div>
        </div>

        {/* Длительность */}
        <div style={onboardingFieldWithSuffixWrapStyle}>
          <input
            value={durationMin}
            onChange={(e) => onDurationChange(e.target.value.replace(/\D/g, ''))}
            placeholder="Продолжительность"
            inputMode="numeric"
            style={onboardingFieldInputStyle}
          />
          <span style={onboardingFieldSuffixStyle}>мин</span>
        </div>

        {/* Стоимость */}
        <div style={onboardingFieldWithSuffixWrapStyle}>
          <input
            value={price}
            onChange={(e) => onPriceChange(e.target.value.replace(/[^\d.]/, ''))}
            placeholder="Стоимость"
            inputMode="decimal"
            style={onboardingFieldInputStyle}
          />
          <span style={onboardingFieldSuffixStyle}>₽</span>
        </div>

        {/* Скидка */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
          <Switch
            checked={discountEnabled}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onDiscountEnabledChange(e.target.checked)}
          />
          <span style={onboardingToggleLabelStyle}>Скидка</span>
          {discountEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              {discountedPriceNum !== null && (
                <div style={onboardingPriceRowStyle}>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>
                    {formatPrice(discountedPriceNum)}
                  </span>
                  <span style={onboardingDiscountBadgeStyle}>{discountPercent}%</span>
                </div>
              )}
              <div style={{ ...onboardingSelectWrapStyle, width: 92 }}>
                <select
                  value={discountPercent}
                  onChange={(e) => onDiscountPercentChange(Number(e.target.value))}
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
            {/* Кнопка добавления */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                width: 72, height: 72, borderRadius: 10,
                background: 'var(--color-card2)', border: 'none',
                cursor: uploading ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, opacity: uploading ? 0.5 : 1,
              }}
            >
              {uploading
                ? <Spinner size={24} appearance="contrast" />
                : <img src={maskIconUrl} alt="upload" style={serviceWorkPhotoAddIconStyle} />
              }
            </button>

            {/* Фото работ */}
            {workPhotos.map((photo, i) => (
              <div key={photo.id} style={{ position: 'relative', width: 72, height: 72 }}>
                <img
                  src={photo.previewUrl}
                  alt=""
                  style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }}
                />
                {photo.uploading && <UploadingOverlay />}
                <button
                  onClick={() => onWorkPhotosChange(workPhotos.filter((_, j) => j !== i))}
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

            {/* Скрытый input */}
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
                  const results = await Promise.allSettled(
                    files.map((file) => uploadPhoto(file, 'work')),
                  )
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
        </div>
      </div>

      {/* Кнопка */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        flexShrink: 0,
      }}>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          style={{
            ...primaryActionButtonBaseStyle,
            cursor: canSave ? 'pointer' : 'default',
            background: canSave ? 'var(--color-primary)' : 'var(--color-card2)',
            color: canSave ? '#fff' : 'var(--color-text-secondary)',
          }}
        >
          Готово
        </button>
      </div>
    </div>,
    document.body,
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
