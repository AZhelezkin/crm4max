import { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
}

export default function Card({ children, style, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-card)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
