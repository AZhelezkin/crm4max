import { text } from '@/styles/typography'

import type { BookingSeriesReferenceReadModel } from './types'

interface BookingSeriesSummaryCardProps {
  series: BookingSeriesReferenceReadModel
  onOpen: () => void
}

export default function BookingSeriesSummaryCard({ series, onOpen }: BookingSeriesSummaryCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Открыть серию"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--color-surface-transparent)',
        borderRadius: 20,
        padding: '16px 20px',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ color: 'var(--color-active-element)', display: 'flex', flexShrink: 0 }}><RepeatIcon /></span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Повторяющаяся</span>
          {series.isException && (
            <span style={{ ...text.caption, color: 'var(--color-on-warning-surface-lite)', background: 'var(--color-warning-surface-lite)', borderRadius: 8, padding: '2px 8px' }}>
              Изменена отдельно
            </span>
          )}
        </span>
        <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{series.summary}</span>
      </span>
      <ChevronRightIcon />
    </button>
  )
}

function RepeatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M2.83 14.32V7.6c0-2.94 2.4-5.34 5.34-5.34h7.66" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13.7 4.43 2.13-2.13L13.7.17" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.17 9.68v6.72c0 2.94-2.4 5.34-5.34 5.34H8.17" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.3 19.57 8.17 21.7l2.13 2.13" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--color-interactive-element-secondary)' }}>
      <path d="M6 4L10.5 8L6 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
