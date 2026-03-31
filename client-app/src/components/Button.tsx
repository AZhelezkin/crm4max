import { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  fullWidth?: boolean
  disabled?: boolean
  style?: CSSProperties
}

const styles: Record<string, CSSProperties> = {
  primary:   { background: 'var(--color-primary)', color: '#fff' },
  secondary: { background: 'var(--color-primary-light)', color: 'var(--color-primary)' },
  danger:    { background: 'transparent', color: 'var(--color-danger)' },
  ghost:     { background: 'transparent', color: 'var(--color-primary)' },
}

export default function Button({ children, onClick, variant = 'primary', fullWidth, disabled, style }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        width: fullWidth ? '100%' : undefined,
        padding: '13px 20px',
        borderRadius: 'var(--radius)',
        fontSize: 15, fontWeight: 600,
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
