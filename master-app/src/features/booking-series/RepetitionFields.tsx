import { text } from '@/styles/typography'

export type RepetitionMode = 'single' | 'series'

interface RepetitionFieldsProps {
  mode: RepetitionMode
  menuOpen: boolean
  summary?: string
  warningsCount?: number
  reviewRequired?: boolean
  onMenuOpenChange: (open: boolean) => void
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
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          onClick={() => onMenuOpenChange(!menuOpen)}
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

        {menuOpen && (
          <div
            role="listbox"
            aria-label="Повторение"
            style={{
              position: 'absolute',
              zIndex: 1000,
              right: 16,
              top: '100%',
              width: 220,
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: 16,
              padding: '12px 20px',
              boxSizing: 'border-box',
              background: 'var(--color-secondary-surface)',
              boxShadow: 'var(--shadow-soft)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ModeOption
              selected={mode === 'single'}
              label="Разовая"
              onClick={() => { onModeChange('single'); onMenuOpenChange(false) }}
            />
            <div style={{ height: 1, background: 'var(--color-divider-low)', margin: '8px 0' }} />
            <ModeOption
              selected={mode === 'series'}
              label="Несколько"
              onClick={() => { onModeChange('series'); onMenuOpenChange(false) }}
            />
          </div>
        )}
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

function ModeOption({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      style={{
        border: 'none',
        background: 'none',
        padding: '6px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: selected ? 'var(--color-active-element)' : 'var(--color-on-surface)',
        cursor: 'pointer',
        textAlign: 'left',
        ...text.body2,
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {selected && <CheckIcon />}
    </button>
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

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
