interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}

/**
 * iOS-стиль переключатель 51×31. Синий когда включён, серый когда нет.
 * Раньше дублировался inline в CalendarPage; используется в онбординге,
 * кабинете мастера и клиенте.
 */
export default function ToggleSwitch({ checked, onChange, disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      aria-label={rest['aria-label']}
      aria-pressed={checked}
      style={{
        width: 51,
        height: 31,
        borderRadius: 16,
        background: checked ? 'var(--color-primary-surface)' : 'var(--color-divider-low)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        padding: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          width: 25,
          height: 25,
          borderRadius: '50%',
          background: 'var(--color-on-primary-surface)',
          transition: 'left 0.2s',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        }}
      />
    </button>
  )
}
