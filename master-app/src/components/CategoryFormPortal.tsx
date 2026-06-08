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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // Закрываем диалог удаления при закрытии формы.
  useEffect(() => { if (!visible) setShowDeleteConfirm(false) }, [visible])

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

        {/* Удаление (только редактирование): trash 20 + «Удалить категорию» (on-error-surface-lite),
            h44 rx12, прозрачный фон. Тап → диалог подтверждения (макеты 9771:44509 / 9771:44619). */}
        {onDelete && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%',
              height: 44,
              marginTop: 8,
              border: 'none',
              borderRadius: 12,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              color: 'var(--color-on-error-surface-lite)',
            }}
          >
            <TrashIcon />
            <span style={{ ...text.callout1 }}>Удалить категорию</span>
          </button>
        )}
      </div>

      {/* Диалог подтверждения удаления категории (макет 9771:44619). */}
      {onDelete && showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 329, boxSizing: 'border-box',
              background: 'var(--color-surface)', borderRadius: 24, padding: '20px 16px 24px',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ padding: '0 8px 8px', fontSize: 20, lineHeight: '24px', fontWeight: 700, letterSpacing: -0.4, color: 'var(--color-on-surface)' }}>
              Удаление категории
            </div>
            <div style={{ padding: '0 8px 8px', ...text.body2, color: 'var(--color-on-surface)' }}>
              Вы уверены, что хотите удалить категорию?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); onDelete() }}
                style={{
                  width: '100%', height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
                  background: 'var(--color-error-surface-lite)', ...text.callout1, color: 'var(--color-on-error-surface-lite)',
                }}
              >
                Удалить
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  width: '100%', height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
                  background: 'var(--color-background)', ...text.callout1, color: 'var(--color-on-surface)',
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

// vuesax/linear/trash 20×20 — для кнопки «Удалить категорию».
function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M17.5 4.983c-2.775-.275-5.567-.417-8.35-.417-1.65 0-3.3.084-4.95.25l-1.7.167M8.083 4.142l.184-1.092c.133-.792.233-1.383 1.641-1.383h2.184c1.408 0 1.516.625 1.641 1.391l.184 1.084M16.146 7.617l-.542 8.391c-.091 1.309-.166 2.325-2.491 2.325H6.887c-2.325 0-2.4-1.016-2.491-2.325l-.542-8.391M8.108 13.75h3.775M7.5 10.417h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
