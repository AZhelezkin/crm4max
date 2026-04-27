import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'

interface Props {
  title: string
  back?: boolean
  right?: React.ReactNode
}

export default function PageHeader({ title, back = true, right }: Props) {
  const navigate = useNavigate()
  return (
    <header style={{
      height: 56,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 16px',
      background: 'var(--color-background)',
      borderBottom: '1px solid var(--color-divider-low)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {back && (
        <button onClick={() => navigate(-1)} style={{ background: 'none', ...text.titleSmall, color: 'var(--color-primary-surface)' }}>
          ←
        </button>
      )}
      <h1 style={{ ...text.subheadline, flex: 1 }}>{title}</h1>
      {right}
    </header>
  )
}
