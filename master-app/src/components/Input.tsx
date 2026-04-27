interface Props {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  multiline?: boolean
}

export default function Input({ label, value, onChange, placeholder, type = 'text', multiline }: Props) {
  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--color-divider-low)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 15,
    background: 'var(--color-on-primary-surface)',
    color: 'var(--color-on-surface)',
    resize: 'none' as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, color: 'var(--color-on-surface-secondary)', fontWeight: 500 }}>{label}</label>}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={inputStyle}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  )
}
