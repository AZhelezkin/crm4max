import { text } from '@/styles/typography'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { uploadPhoto } from '@/api/upload.api'
import { HeroHeader, FloatingField, GradientAvatarButton } from '@/components/onboardingShared'

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
  /** True пока идёт загрузка фото (нужно OnboardingPage для кнопки) */
  photoUploading: boolean
  onPhotoUploading: (v: boolean) => void
  onClose: () => void
  onSave: () => void
  /** Удаление категории (только в режиме редактирования). */
  onDelete?: () => void
}

// Создание/редактирование категории (макеты profile-category-create[-full]).
// Hero-шапка + аватар 104 (фиолетовый градиент) + поля с плавающим лейблом +
// кнопка «Создать»/«Сохранить». Размеры (our y = svg−124): аватар y64, поле имени
// y192 (h72), описание y272 (h120, top-aligned). Gaps: header→avatar 8, avatar→имя 24, имя→описание 8.
export default function CategoryFormPortal({
  visible, isEdit,
  name, onNameChange,
  desc, onDescChange,
  photoPreview, onPhotoPreview, onPhotoUrl,
  photoUploading, onPhotoUploading,
  onClose, onSave, onDelete,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Сбрасываем подтверждение удаления при закрытии формы.
  useEffect(() => { if (!visible) setConfirmDelete(false) }, [visible])

  if (!visible) return null

  const canSave = !!name.trim() && !photoUploading

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      // Портал рендерится в document.body (вне #root), поэтому hero-градиент
      // (2 круга + surface→background, 0→390px) применяем вручную + скругление верха 24.
      background: 'var(--gradient-hero-background)',
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      zIndex: 200,
      display: 'flex', flexDirection: 'column',
    }}>
      <HeroHeader
        title={isEdit ? 'Редактирование категории' : 'Создание категории'}
        onBack={onClose}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px calc(48px + env(safe-area-inset-bottom))' }}>
        {/* Аватар 104 (фиолетовый градиент + камера / фото) */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GradientAvatarButton
            photoPreview={photoPreview}
            uploading={photoUploading}
            onPick={() => fileRef.current?.click()}
          />
        </div>
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

        {/* Название */}
        <div style={{ marginTop: 24 }}>
          <FloatingField
            label="Название категории"
            value={name}
            onChange={onNameChange}
            autoFocus
          />
        </div>

        {/* Описание — высокое поле (120), контент сверху */}
        <div style={{ marginTop: 8 }}>
          <FloatingField
            label="Описание"
            value={desc}
            onChange={(v) => onDescChange(v.slice(0, 200))}
            multiline
            minHeight={120}
            align="top"
            rows={3}
            maxLength={200}
          />
        </div>
        {/* Кнопки — в конце контента (скроллятся вместе с ним, не прибиты к низу) */}
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          style={{
            width: '100%',
            height: 60,
            marginTop: 24,
            borderRadius: 20,
            border: 'none',
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...text.callout1,
            cursor: canSave ? 'pointer' : 'default',
            background: canSave ? 'var(--color-primary-surface)' : 'var(--color-secondary-surface-muted)',
            color: canSave ? 'var(--color-on-primary-surface)' : 'var(--color-interactive-element-muted)',
          }}
        >
          {isEdit ? 'Сохранить' : 'Создать'}
        </button>

        {/* Удаление (только редактирование) — двойной тап для подтверждения */}
        {onDelete && (
          <button
            type="button"
            onClick={() => { if (confirmDelete) onDelete(); else setConfirmDelete(true) }}
            style={{
              width: '100%',
              height: 48,
              marginTop: 8,
              border: 'none',
              borderRadius: 20,
              ...text.callout1,
              cursor: 'pointer',
              background: confirmDelete ? 'rgba(209, 50, 50, 0.12)' : 'transparent',
              color: 'var(--color-error-surface-accented)',
            }}
          >
            {confirmDelete ? 'Подтвердите удаление' : 'Удалить категорию'}
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
