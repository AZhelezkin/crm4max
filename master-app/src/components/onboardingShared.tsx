// Общие компоненты онбординга/каталога: hero-шапка, поле с плавающим лейблом,
// аватар-загрузчик и иконки. Используются в OnboardingPage (шаги 0/1/2)
// и каталоге услуг.

import { text } from '@/styles/typography'
import { useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Spinner } from '@maxhub/max-ui'

// ── Hero-шапка: круглый back 44×44 (left 12) + центрированный заголовок ─────────
// Лежит на hero-градиенте (#root > div). h=56 (back 44 + 6/6). Макет shedule.svg.
export function HeroHeader({ title, onBack }: { title: ReactNode; onBack: () => void }) {
  return (
    <div style={{
      position: 'relative',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6px 12px',
      flexShrink: 0,
    }}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Назад"
        style={{
          position: 'absolute',
          left: 12,
          width: 44, height: 44,
          borderRadius: '50%',
          background: 'var(--color-background)',
          color: 'var(--color-on-surface-soften)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ArrowLeftIcon />
      </button>
      {/* Заголовок hero — Callout 1 17/700/-0.17 (Figma maxToolbar title, Nunito Sans Bold). */}
      <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{title}</div>
    </div>
  )
}

// ── Аватар-загрузчик: круг с фиолетовым градиентом и белой иконкой камеры,
// при наличии фото — фото. Макеты 8794:54710 (профиль), profile-category-create.
export function GradientAvatarButton({ photoPreview, uploading, onPick, size = 104 }: {
  photoPreview: string | null
  uploading: boolean
  onPick: () => void
  size?: number
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={uploading}
      aria-label="Загрузить фото"
      style={{
        width: size, height: size,
        borderRadius: '50%',
        border: 'none',
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
        background: photoPreview
          ? 'transparent'
          : 'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)',
        cursor: uploading ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {photoPreview
        ? <img src={photoPreview} alt="Фото" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ color: '#FFFFFF', display: 'flex' }}><CameraBoldIcon /></div>
      }
      {uploading && <UploadingOverlay />}
    </button>
  )
}

// ── Поле с плавающим лейблом (макет 8794:60965) ────────────────────────────────
// Пусто → плейсхолдер по центру. Есть значение/фокус → лейбл всплывает наверх
// (caption, on-surface-secondary), значение под ним (body2). Фокус → фон surface
// + рамка 2px active-element. Крестик очистки — при фокусе и непустом значении.
// Вертикаль (single-line): 15 + label 16 + gap 2 + value 24 + 15 = 72.
export interface FloatingFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  inputMode?: 'text' | 'tel' | 'numeric' | 'email'
  maxLength?: number
  multiline?: boolean
  autoFocus?: boolean
  inputRef?: RefObject<HTMLTextAreaElement>
  /** Мин. высота контейнера (single-line по умолчанию 72; для описания 120). */
  minHeight?: number
  /** Выравнивание контента: center (одна строка) или top (высокое описание). */
  align?: 'center' | 'top'
  /** Кол-во видимых строк textarea (multiline). */
  rows?: number
  /** Суффикс справа от значения (например «₽», «%»). При наличии крестик не показывается. */
  suffix?: string
  /** Значение поля жирным (Figma «Callout 1» 17/700) вместо обычного body2 — макеты клиента. */
  valueBold?: boolean
}

export function FloatingField({
  label, value, onChange, type = 'text', inputMode, maxLength, multiline = false, autoFocus, inputRef,
  minHeight = 72, align = 'center', rows = 1, suffix, valueBold = false,
}: FloatingFieldProps) {
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0
  const showClear = focused && value.length > 0 && !suffix

  const innerInputStyle: CSSProperties = {
    ...(valueBold ? text.callout1 : text.body2),
    width: '100%',
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--color-on-surface)',
    padding: 0,
    fontFamily: 'inherit',
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight,
      boxSizing: 'border-box',
      borderRadius: 20,
      padding: '15px 20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: align === 'top' ? 'flex-start' : 'center',
      background: focused ? 'var(--color-surface)' : 'var(--color-surface-transparent)',
      boxShadow: focused ? 'inset 0 0 0 2px var(--color-active-element)' : undefined,
      transition: 'background 0.15s ease, box-shadow 0.15s ease',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', paddingRight: showClear ? 32 : 0 }}>
        {floated && (
          <span style={{
            ...text.caption,
            color: 'var(--color-on-surface-secondary)',
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {label}
          </span>
        )}
        {multiline ? (
          <textarea
            ref={inputRef}
            value={value}
            placeholder={floated ? '' : label}
            autoFocus={autoFocus}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={rows}
            maxLength={maxLength}
            style={{ ...innerInputStyle, resize: 'none', overflowY: 'auto' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type={type}
              inputMode={inputMode}
              value={value}
              placeholder={floated ? '' : label}
              autoFocus={autoFocus}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={maxLength}
              style={{ ...innerInputStyle, flex: 1, width: 'auto' }}
            />
            {suffix && (
              <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)', flexShrink: 0 }}>
                {suffix}
              </span>
            )}
          </div>
        )}
      </div>
      {showClear && (
        <button
          type="button"
          aria-label="Очистить"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 20,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 24,
            height: 24,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-interactive-element-secondary)',
          }}
        >
          <ClearFieldIcon />
        </button>
      )}
    </div>
  )
}

// ─── Иконки ────────────────────────────────────────────────────────────────────

export function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CameraBoldIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M24 8C23.1867 8 22.44 7.53333 22.0667 6.81333L21.1067 4.88C20.4933 3.66667 18.8933 2.66667 17.5333 2.66667H14.48C13.1067 2.66667 11.5067 3.66667 10.8933 4.88L9.93333 6.81333C9.56 7.53333 8.81333 8 8 8C5.10667 8 2.81333 10.44 3 13.32L3.69333 24.3333C3.85333 27.08 5.33333 29.3333 9.01333 29.3333H22.9867C26.6667 29.3333 28.1333 27.08 28.3067 24.3333L29 13.32C29.1867 10.44 26.8933 8 24 8ZM14 9.66667H18C18.5467 9.66667 19 10.12 19 10.6667C19 11.2133 18.5467 11.6667 18 11.6667H14C13.4533 11.6667 13 11.2133 13 10.6667C13 10.12 13.4533 9.66667 14 9.66667ZM16 24.16C13.52 24.16 11.4933 22.1467 11.4933 19.6533C11.4933 17.16 13.5067 15.1467 16 15.1467C18.4933 15.1467 20.5067 17.16 20.5067 19.6533C20.5067 22.1467 18.48 24.16 16 24.16Z" fill="currentColor" fillOpacity="0.6" />
    </svg>
  )
}

// Крестик очистки — X, нормализован в 24×24 (макет 8794:60965).
export function ClearFieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M17 7L7 17M7 7L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function UploadingOverlay() {
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
