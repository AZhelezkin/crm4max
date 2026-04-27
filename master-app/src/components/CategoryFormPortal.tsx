import { text } from '@/styles/typography'
import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { Spinner } from '@maxhub/max-ui'
import { uploadPhoto } from '@/api/upload.api'
import uploadIconUrl from '@/assets/upload-icon.svg'
import {
  onboardingFieldInputStyle,
  onboardingFieldWrapStyle,
  onboardingPortalContentStyle,
  primaryActionButtonBaseStyle,
  stepOneCounterStyle,
  stepOneIntroTextStyle,
  stepOnePhotoButtonBaseStyle,
  stepOnePhotoContainerStyle,
  stepOnePhotoPlaceholderStyle,
  stepOnePhotoPreviewStyle,
  stepOneTextareaStyle,
  stepOneTextareaWrapStyle,
} from '@/components/onboardingStepOne.styles'

interface Props {
  visible: boolean
  isEdit: boolean
  name: string
  onNameChange: (v: string) => void
  desc: string
  onDescChange: (v: string) => void
  /** Отображаемый превью (blob URL или S3 URL) */
  photoPreview: string | null
  /** Вызывается с blob URL сразу после выбора файла */
  onPhotoPreview: (v: string | null) => void
  /** Вызывается с S3 URL после успешной загрузки */
  onPhotoUrl: (v: string | null) => void
  /** True пока идёт загрузка фото (нужно OnboardingPage для кнопки «Далее») */
  photoUploading: boolean
  onPhotoUploading: (v: boolean) => void
  onClose: () => void
  onSave: () => void
}

export default function CategoryFormPortal({
  visible, isEdit,
  name, onNameChange,
  desc, onDescChange,
  photoPreview, onPhotoPreview, onPhotoUrl,
  photoUploading, onPhotoUploading,
  onClose, onSave,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  if (!visible) return null

  const canSave = name.trim() && !photoUploading

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--color-background)',
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
            color: 'var(--color-primary-surface)', padding: 0,
          }}
        >
          <BackArrowIcon />
        </button>
        <div style={{
          flex: 1, textAlign: 'center',
          ...text.titleSmall,
          color: 'var(--color-on-surface)', letterSpacing: -0.3,
        }}>
          {isEdit ? 'Редактирование категории' : 'Добавление категории'}
        </div>
        <div style={{ width: 56 }} />
      </div>

      {/* Контент */}
      <div style={onboardingPortalContentStyle}>
        <div style={stepOneIntroTextStyle}>
          Добавьте фото категории, чтобы клиентам было проще выбирать услуги
        </div>

        <div style={stepOnePhotoContainerStyle}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoUploading}
            style={{ ...stepOnePhotoButtonBaseStyle, cursor: photoUploading ? 'default' : 'pointer' }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="Фото категории" style={stepOnePhotoPreviewStyle} />
              : <img src={uploadIconUrl} alt="Загрузить фото" style={stepOnePhotoPlaceholderStyle} />
            }
            {photoUploading && <UploadingOverlay />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              onPhotoPreview(URL.createObjectURL(file))
              onPhotoUploading(true)
              try {
                const url = await uploadPhoto(file, 'categories')
                onPhotoUrl(url)
                onPhotoPreview(url)
              } catch (err) {
                console.error('Ошибка загрузки фото категории:', err)
              } finally {
                onPhotoUploading(false)
                e.target.value = ''
              }
            }}
          />
        </div>

        <div style={onboardingFieldWrapStyle}>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Название"
            autoFocus
            style={onboardingFieldInputStyle}
          />
        </div>

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
            background: canSave ? 'var(--color-primary-surface)' : 'var(--color-secondary-surface)',
            color: canSave ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface-secondary)',
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
      <Spinner size={20} appearance="contrast-static" />
    </div>
  )
}
