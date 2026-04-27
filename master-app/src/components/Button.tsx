import { CSSProperties, ReactNode } from 'react'
import { text } from '@/styles/typography'

interface Props {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  fullWidth?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
}

const styles: Record<string, CSSProperties> = {
  primary: {
    background: 'var(--color-primary-surface)',
    color: 'var(--color-on-primary-surface)',
  },
  secondary: {
    background: 'var(--color-active-surface)',
    color: 'var(--color-primary-surface)',
  },
  danger: {
    background: 'transparent',
    color: 'var(--color-error-surface-accented)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-primary-surface)',
  },
}

export default function Button({
  children, onClick, variant = 'primary', fullWidth, disabled, type = 'button', style,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        width: fullWidth ? '100%' : undefined,
        padding: '13px 20px',
        borderRadius: 'var(--radius)',
        ...text.body,
        fontWeight: 600,
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
