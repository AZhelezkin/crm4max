/**
 * Двухкнопочный segment-control (Figma 8557:24771).
 * Контейнер: bg=surfaceTransparent, h=44, padding 4, gap 4, rx=16.
 * Кнопка: flex-1, h=36, padding 10, rx=12.
 * Active: bg=secondarySurface, text=interactiveElementAccented.
 * Inactive: bg=transparent, text=interactiveElement.
 * Шрифт: Bold 14/20 ls -0.14 (Callout 2).
 */

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  onChange: (v: T) => void
  options: [Option<T>, Option<T>]
}

export default function SegmentControl<T extends string>({ value, onChange, options }: Props<T>) {
  return (
    <div style={{
      background: 'var(--color-surface-transparent)',
      borderRadius: 16,
      height: 44,
      padding: 4,
      display: 'flex',
      gap: 4,
      width: '100%',
    }}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, minWidth: 0,
              height: 36,
              padding: 10,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--color-secondary-surface)' : 'transparent',
              color: active
                ? 'var(--color-interactive-element-accented)'
                : 'var(--color-interactive-element)',
              fontSize: 14, lineHeight: '20px', fontWeight: 700, letterSpacing: -0.14,
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
