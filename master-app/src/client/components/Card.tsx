import { CSSProperties, ReactNode } from 'react'

export default function Card({ children, style, onClick }: {
  children: ReactNode; style?: CSSProperties; onClick?: () => void
}) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius)',
      padding: '14px 16px', cursor: onClick ? 'pointer' : undefined, ...style,
    }}>
      {children}
    </div>
  )
}
