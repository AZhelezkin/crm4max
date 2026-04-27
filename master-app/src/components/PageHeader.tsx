import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'

interface Props {
  title: string
  back?: boolean
  onBack?: () => void
  right?: React.ReactNode
}

export default function PageHeader({ title, back = true, onBack, right }: Props) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <header style={{
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      background: 'var(--color-background)',
      borderBottom: '1px solid var(--color-divider-low)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {back && (
          <button
            onClick={handleBack}
            style={{ background: 'none', ...text.titleSmall, color: 'var(--color-primary-surface)', lineHeight: 1 }}
          >
            ←
          </button>
        )}
      </div>
      <h1 style={{ ...text.subheadline, position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>{title}</h1>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {right}
      </div>
    </header>
  )
}
