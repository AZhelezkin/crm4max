import { BookingFlowBottomButton } from '@/components/BookingFlowShell'
import { text } from '@/styles/typography'

import { formatRecurrenceSummary } from './recurrence'
import type { BookingSeriesCreateResponse, RecurrenceRule } from './types'

interface SeriesCreationSuccessProps {
  receipt: BookingSeriesCreateResponse
  rule: RecurrenceRule
  clientName: string
  serviceNames: string[]
  onOpenSeries: () => void
  onClose: () => void
}

export default function SeriesCreationSuccess({
  receipt,
  rule,
  clientName,
  serviceNames,
  onOpenSeries,
  onClose,
}: SeriesCreationSuccessProps) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 76, boxSizing: 'border-box', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, background: 'linear-gradient(149.74deg, var(--color-grad-green-vibrance-0) 7.31%, var(--color-grad-green-vibrance-100) 91.96%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-primary-surface)' }}>
            <TickIcon />
          </div>
          <div style={{ flex: 1, minWidth: 0, ...text.callout1, color: 'var(--color-on-surface)' }}>Серия создана!</div>
        </div>
        <button type="button" onClick={onClose} style={{ height: 44, padding: '0 10px', borderRadius: 22, background: 'var(--color-background)', border: 'none', cursor: 'pointer', ...text.callout1, color: 'var(--color-on-surface)' }}>
          Закрыть
        </button>
      </div>

      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <InfoCard label="Клиент" value={clientName} />
        <InfoCard label="Услуги" value={serviceNames.join(', ')} />
        <InfoCard label="Расписание" value={formatRecurrenceSummary(rule)} />
        <div style={{
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: 20,
          padding: '16px 20px',
          background: 'var(--color-success-surface-lite)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <span style={{ ...text.callout1, color: 'var(--color-on-success-surface-lite)' }}>
            Создано записей: {receipt.materializedCount}
          </span>
          <span style={{ ...text.caption2, color: 'var(--color-on-success-surface-lite)' }}>
            Ближайшие записи добавлены, остальные будут добавляться автоматически
          </span>
        </div>
      </div>

      <BookingFlowBottomButton onClick={onOpenSeries}>Открыть серию</BookingFlowBottomButton>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', borderRadius: 20, padding: '16px 20px', background: 'var(--color-surface-transparent)', display: 'flex', flexDirection: 'column' }}>
      <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{value}</span>
      <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{label}</span>
    </div>
  )
}

function TickIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5L9.5 17L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
