import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  back?: boolean
  right?: React.ReactNode
}

export default function PageHeader({ title, back = true, right }: Props) {
  const navigate = useNavigate()
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '16px 16px 12px',
      background: 'var(--color-card)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {back && (
        <button onClick={() => navigate(-1)} style={{ background: 'none', fontSize: 20, color: 'var(--color-primary)' }}>
          ←
        </button>
      )}
      <h1 style={{ fontSize: 17, fontWeight: 600, flex: 1 }}>{title}</h1>
      {right}
    </header>
  )
}
