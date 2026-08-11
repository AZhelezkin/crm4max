import { text } from '@/styles/typography'

export type RepetitionMode = 'single' | 'series'

interface RepetitionFieldsProps {
  mode: RepetitionMode
  menuOpen: boolean
  summary?: string
  warningsCount?: number
  reviewRequired?: boolean
  onMenuOpenChange: (open: boolean, trigger?: HTMLButtonElement) => void
  onModeChange: (mode: RepetitionMode) => void
  onEditSchedule: () => void
}

export default function RepetitionFields({
  mode,
  menuOpen,
  summary,
  warningsCount = 0,
  reviewRequired = false,
  onMenuOpenChange,
  onModeChange,
  onEditSchedule,
}: RepetitionFieldsProps) {
  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(event) => onMenuOpenChange(!menuOpen, event.currentTarget)}
          style={rowStyle}
        >
          <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)', flex: 1, minWidth: 0 }}>Повторение</span>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{ ...text.body2, color: 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>
              {mode === 'series' ? 'Несколько' : 'Разовая'}
            </span>
            <ChevronRightIcon />
          </span>
        </button>

      </div>

      {mode === 'series' && (
        <button type="button" onClick={onEditSchedule} style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)', flex: 1, minWidth: 0 }}>Расписание</span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ ...text.body2, color: summary ? 'var(--color-on-surface)' : 'var(--color-primary-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {summary || 'Настроить'}
              </span>
              {warningsCount > 0 && (
                <span style={{ ...text.caption2, color: 'var(--color-warning-surface-accented)' }}>
                  Конфликтов: {warningsCount}
                </span>
              )}
              {reviewRequired && (
                <span style={{ ...text.caption2, color: 'var(--color-warning-surface-accented)' }}>
                  Проверьте расписание снова
                </span>
              )}
            </span>
            <ChevronRightIcon />
          </span>
        </button>
      )}
    </>
  )
}

const rowStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: 16,
  background: 'none',
  border: 'none',
  borderBottom: '1px solid var(--color-secondary-surface-muted)',
  cursor: 'pointer',
  textAlign: 'left',
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--color-interactive-element-secondary)' }}>
      <path d="M6 4L10.5 8L6 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
