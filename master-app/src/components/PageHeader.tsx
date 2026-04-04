import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  back?: boolean
  onBack?: () => void
}

export default function PageHeader({ title, back = true, onBack }: Props) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '16px 16px 12px',
      background: 'var(--color-card)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {back && (
        <button
          onClick={handleBack}
          style={{ background: 'none', fontSize: 20, color: 'var(--color-primary)', lineHeight: 1 }}
        >
          ←
        </button>
      )}
      <h1 style={{ fontSize: 17, fontWeight: 600 }}>{title}</h1>
    </header>
  )
}
