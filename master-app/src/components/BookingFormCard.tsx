import { text } from '@/styles/typography'

export function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', background: 'var(--color-surface-transparent)', borderRadius: 20, boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
        <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

export function FormRow({ label, value, prompt, right, onClick, noArrow, last, stacked, menuOpen }: {
  label: string
  value?: string
  prompt?: boolean
  right?: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  noArrow?: boolean
  last?: boolean
  stacked?: boolean
  menuOpen?: boolean
}) {
  const rowStyle: React.CSSProperties = {
    width: '100%', display: 'flex', flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center', justifyContent: 'space-between', gap: 8,
    padding: 16, background: 'none', border: 'none',
    borderBottom: last ? 'none' : '1px solid var(--color-secondary-surface-muted)',
    cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
  }
  const inner = (
    <>
      <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)', flex: stacked ? undefined : 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flex: 1, minWidth: 0 }}>
        {right ?? (
          <span style={{ ...text.body2, color: prompt ? 'var(--color-primary-surface)' : 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
        )}
        {!noArrow && <ArrowRightIcon />}
      </span>
    </>
  )
  return onClick
    ? <button type="button" onClick={onClick} aria-haspopup={menuOpen === undefined ? undefined : 'menu'} aria-expanded={menuOpen} style={rowStyle}>{inner}</button>
    : <div style={rowStyle}>{inner}</div>
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5.5 3L10.5 8L5.5 13" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
