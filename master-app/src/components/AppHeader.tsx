import type { ReactNode } from 'react'
import { text } from '@/styles/typography'

interface Props {
  title: string
  onBack?: () => void
  /** Правый слот (иконка/кнопка). Если не задан — рендерится пустой блок для центровки заголовка. */
  right?: ReactNode
}

/**
 * Единая шапка для экранов онбординга, профиля мастера и портала адреса.
 * Стиль — тот же, что задавал шаг 0 онбординга: 56 высотой, фон var(--color-background),
 * sticky-top, двухпутевая «Назад» стрелка var(--color-on-surface), заголовок 17/600 по центру.
 */
export default function AppHeader({ title, onBack, right }: Props) {
  return (
    <div
      style={{
        height: 56,
        background: 'var(--color-background)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {onBack ? (
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            flexShrink: 0,
          }}
          aria-label="Назад"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15.57 17.93L9.5 12l6.07-6.07" stroke="var(--color-on-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.5 12H9.67" stroke="var(--color-on-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : (
        <div style={{ width: 40, flexShrink: 0 }} />
      )}

      <div
        style={{
          flex: 1,
          ...text.callout,
          fontWeight: 600,
          color: 'var(--color-on-surface)',
          textAlign: 'center',
        }}
      >
        {title}
      </div>

      <div style={{ width: 40, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {right}
      </div>
    </div>
  )
}
