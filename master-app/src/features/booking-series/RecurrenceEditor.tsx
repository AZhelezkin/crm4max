import { useMemo, useState } from 'react'

import { BookingFlowBottomButton, BookingFlowToolbar } from '@/components/BookingFlowShell'
import TimeWheelPicker from '@/components/TimeWheelPicker'
import ToggleSwitch from '@/components/ToggleSwitch'
import { ArrowLeftIcon, FloatingField } from '@/components/onboardingShared'
import { text } from '@/styles/typography'

import { generateOccurrenceDates, validateRecurrenceRule } from './recurrence'
import type {
  BookingSeriesPreviewResponse,
  IsoWeekday,
  RecurrenceRule,
  SeriesOccurrenceDate,
  SeriesWarning,
  SeriesWarningType,
} from './types'

const WEEKDAYS: { value: IsoWeekday; label: string; fullLabel: string }[] = [
  { value: 1, label: 'Пн', fullLabel: 'Понедельник' },
  { value: 2, label: 'Вт', fullLabel: 'Вторник' },
  { value: 3, label: 'Ср', fullLabel: 'Среда' },
  { value: 4, label: 'Чт', fullLabel: 'Четверг' },
  { value: 5, label: 'Пт', fullLabel: 'Пятница' },
  { value: 6, label: 'Сб', fullLabel: 'Суббота' },
  { value: 7, label: 'Вс', fullLabel: 'Воскресенье' },
]

interface RecurrenceEditorProps {
  initialRule: RecurrenceRule
  preview?: BookingSeriesPreviewResponse | null
  previewRequired?: boolean
  errorMessage?: string | null
  showValidationInitially?: boolean
  title?: string
  subtitle?: string
  saveLabel?: string
  templateContent?: React.ReactNode
  saveDisabled?: boolean
  onBack: () => void
  onSave: (rule: RecurrenceRule) => void | Promise<void>
}

export default function RecurrenceEditor({
  initialRule,
  preview = null,
  previewRequired = false,
  errorMessage = null,
  showValidationInitially = false,
  title = 'Расписание',
  subtitle,
  saveLabel = 'Сохранить расписание',
  templateContent,
  saveDisabled = false,
  onBack,
  onSave,
}: RecurrenceEditorProps) {
  const [draft, setDraft] = useState(initialRule)
  const [showValidation, setShowValidation] = useState(showValidationInitially)
  const [timePickerDay, setTimePickerDay] = useState<IsoWeekday | null>(null)
  const [saving, setSaving] = useState(false)
  const validation = useMemo(() => validateRecurrenceRule(draft), [draft])
  const localOccurrences = useMemo(
    () => validation.valid ? generateOccurrenceDates(draft) : [],
    [draft, validation.valid],
  )
  const activePreview = JSON.stringify(draft) === JSON.stringify(initialRule) ? preview : null
  const shownOccurrences = activePreview?.occurrences.length ? activePreview.occurrences : localOccurrences.map((item) => ({ ...item, warnings: [] }))

  const updateDateRange = (changes: Partial<Pick<RecurrenceRule, 'startDate' | 'endDate'>>) => {
    setDraft((current) => ({ ...current, ...changes }))
  }

  const toggleDay = (dayOfWeek: IsoWeekday) => {
    setDraft((current) => {
      const existing = current.slots.find((slot) => slot.dayOfWeek === dayOfWeek)
      if (existing) return { ...current, slots: current.slots.filter((slot) => slot.dayOfWeek !== dayOfWeek) }
      return {
        ...current,
        slots: [...current.slots, { dayOfWeek, time: '' }]
          .sort((left, right) => left.dayOfWeek - right.dayOfWeek),
      }
    })
  }

  const updateTime = (dayOfWeek: IsoWeekday, time: string) => {
    setDraft((current) => ({
      ...current,
      slots: current.slots.map((slot) => slot.dayOfWeek === dayOfWeek ? { ...slot, time } : slot),
    }))
  }

  const submit = async () => {
    setShowValidation(true)
    if (!validation.valid || saveDisabled || saving) return
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ height: '100dvh', minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <BookingFlowToolbar title={title} subtitle={subtitle} onBack={onBack} backIcon={<ArrowLeftIcon />} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px calc(132px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {templateContent}
        <SectionTitle>Период</SectionTitle>
        <FloatingField
          label="Дата начала"
          type="date"
          value={draft.startDate}
          onChange={(startDate) => updateDateRange({ startDate })}
          error={showValidation && validation.errors.some((error) => error.field === 'startDate')}
        />
        <div style={toggleRowStyle}>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Без даты окончания</span>
            <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Серия будет продолжаться автоматически</span>
          </span>
          <ToggleSwitch
            checked={draft.endDate === null}
            onChange={(withoutEnd) => updateDateRange({ endDate: withoutEnd ? null : draft.startDate })}
            aria-label="Без даты окончания"
          />
        </div>
        {draft.endDate !== null && (
          <FloatingField
            label="Дата окончания"
            type="date"
            value={draft.endDate}
            onChange={(endDate) => updateDateRange({ endDate })}
            error={showValidation && validation.errors.some((error) => error.field === 'endDate')}
          />
        )}

        <SectionTitle>Периодичность</SectionTitle>
        <div style={segmentStyle}>
          <SegmentButton active={draft.intervalWeeks === 1} onClick={() => setDraft((current) => ({ ...current, intervalWeeks: 1 }))}>
            Каждую неделю
          </SegmentButton>
          <SegmentButton active={draft.intervalWeeks === 2} onClick={() => setDraft((current) => ({ ...current, intervalWeeks: 2 }))}>
            Раз в две недели
          </SegmentButton>
        </div>

        <SectionTitle>Дни недели</SectionTitle>
        <div role="group" aria-label="Дни недели" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {WEEKDAYS.map((day) => {
            const selected = draft.slots.some((slot) => slot.dayOfWeek === day.value)
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleDay(day.value)}
                style={{
                  height: 69,
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  ...text.body2Medium,
                  background: selected ? 'var(--color-primary-surface)' : 'var(--color-surface-transparent)',
                  color: selected ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)',
                }}
              >
                {day.label}
              </button>
            )
          })}
        </div>

        {draft.slots.length > 0 && (
          <>
            <SectionTitle>Время</SectionTitle>
            {draft.slots.map((slot) => {
              const day = WEEKDAYS.find((item) => item.value === slot.dayOfWeek)
              return (
                <button key={slot.dayOfWeek} type="button" onClick={() => setTimePickerDay(slot.dayOfWeek)} style={timeRowStyle}>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{day?.fullLabel}</span>
                    <span style={{ ...text.callout1, color: slot.time ? 'var(--color-on-surface)' : 'var(--color-primary-surface)' }}>
                      {slot.time || 'Выбрать время'}
                    </span>
                  </span>
                  <ChevronRightIcon />
                </button>
              )
            })}
          </>
        )}

        <SectionTitle>Ближайшие записи</SectionTitle>
        <OccurrencePreview occurrences={shownOccurrences} />

        {activePreview && (
          <AuthoritativePreviewSummary preview={activePreview} endless={draft.endDate === null} />
        )}

        {showValidation && !validation.valid && (
          <div style={errorCardStyle}>
            {validation.errors.map((error) => (
              <div key={`${error.field}:${error.code}`} style={{ ...text.caption1, color: 'var(--color-on-error-surface-lite)' }}>
                {error.message}
              </div>
            ))}
          </div>
        )}

        {errorMessage && (
          <div role="alert" style={errorCardStyle}>
            <div style={{ ...text.caption1, color: 'var(--color-on-error-surface-lite)' }}>{errorMessage}</div>
          </div>
        )}

        {activePreview && activePreview.warningsCount > 0 && (
          <WarningSummary warnings={activePreview.occurrences.flatMap((occurrence) => occurrence.warnings)} />
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2 }}>
        <BookingFlowBottomButton disabled={!validation.valid || saveDisabled || saving} onClick={() => { void submit() }}>
          {saving ? 'Проверяем…' : previewRequired && !activePreview ? 'Продолжить' : saveLabel}
        </BookingFlowBottomButton>
      </div>
      <TimeWheelPicker
        open={timePickerDay !== null}
        value={draft.slots.find((slot) => slot.dayOfWeek === timePickerDay)?.time || '12:00'}
        getTone={() => 'success'}
        onSelect={(value) => { if (timePickerDay !== null) updateTime(timePickerDay, value) }}
        onClose={() => setTimePickerDay(null)}
      />
    </div>
  )
}

export function OccurrencePreview({ occurrences }: { occurrences: (SeriesOccurrenceDate & { warnings?: SeriesWarning[] })[] }) {
  if (occurrences.length === 0) {
    return (
      <div style={previewCardStyle}>
        <span style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)' }}>Записи появятся после настройки дней и времени</span>
      </div>
    )
  }

  return (
    <div style={{ ...previewCardStyle, padding: 0 }}>
      {occurrences.map((occurrence, index) => (
        <div
          key={`${occurrence.date}:${occurrence.time}`}
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: index === occurrences.length - 1 ? 'none' : '1px solid var(--color-divider-low)',
          }}
        >
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatLocalDate(occurrence.date)}</span>
            {!!occurrence.warnings?.length && (
              <span style={{ ...text.caption2, color: 'var(--color-warning-surface-accented)' }}>
                {occurrence.warnings.map((warning) => warningLabel(warning.type)).join(', ')}
              </span>
            )}
          </span>
          <span style={{ ...text.callout1, color: occurrence.warnings?.length ? 'var(--color-warning-surface-accented)' : 'var(--color-on-surface)' }}>
            {occurrence.time}
          </span>
        </div>
      ))}
    </div>
  )
}

function AuthoritativePreviewSummary({ preview, endless }: { preview: BookingSeriesPreviewResponse; endless: boolean }) {
  return (
    <div style={{ ...previewCardStyle, display: 'flex', flexDirection: 'column' }}>
      <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
        {endless
          ? `Без даты окончания · показаны первые ${preview.occurrences.length}`
          : `Всего записей: ${preview.estimatedTotalOccurrences ?? preview.occurrences.length}`}
      </span>
      <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
        В ближайшие 90 дней: {preview.materializationOccurrences}
      </span>
      {preview.warningsCount > 0 && (
        <span style={{ ...text.caption2, color: 'var(--color-warning-surface-accented)' }}>
          Предупреждений: {preview.warningsCount}
        </span>
      )}
    </div>
  )
}

export function WarningSummary({ warnings }: { warnings: SeriesWarning[] }) {
  const counts = warnings.reduce<Record<SeriesWarningType, number>>((result, warning) => {
    result[warning.type] += 1
    return result
  }, {
    BOOKING_OVERLAP: 0,
    OUTSIDE_WORKING_HOURS: 0,
    BREAK_OVERLAP: 0,
    PAYMENT_REQUIRES_MANUAL_ACTION: 0,
  })
  const entries = (Object.entries(counts) as [SeriesWarningType, number][]).filter(([, count]) => count > 0)

  return (
    <div style={warningCardStyle}>
      <span style={{ color: 'var(--color-warning-surface-accented)', display: 'flex', flexShrink: 0 }}><WarningIcon /></span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ ...text.callout1, color: 'var(--color-on-warning-surface-lite)' }}>Есть предупреждения</span>
        {entries.map(([type, count]) => (
          <span key={type} style={{ ...text.caption2, color: 'var(--color-on-warning-surface-lite)' }}>
            {warningLabel(type)}: {count}
          </span>
        ))}
      </span>
    </div>
  )
}

function warningLabel(type: SeriesWarningType): string {
  if (type === 'BOOKING_OVERLAP') return 'Занятое время'
  if (type === 'BREAK_OVERLAP') return 'Время перерыва'
  if (type === 'PAYMENT_REQUIRES_MANUAL_ACTION') return 'Нужно обработать оплату'
  return 'Вне рабочего времени'
}

function formatLocalDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 8px 4px' }}>
      <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface)' }}>{children}</span>
    </div>
  )
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        height: 36,
        borderRadius: 12,
        border: 'none',
        padding: 10,
        cursor: 'pointer',
        ...text.callout2,
        background: active ? 'var(--color-secondary-surface)' : 'transparent',
        color: active ? 'var(--color-interactive-element-accented)' : 'var(--color-interactive-element)',
      }}
    >
      {children}
    </button>
  )
}

const segmentStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  height: 44,
  alignItems: 'center',
  padding: 4,
  borderRadius: 16,
  background: 'var(--color-surface-transparent)',
  width: '100%',
  boxSizing: 'border-box',
}

const toggleRowStyle: React.CSSProperties = {
  minHeight: 72,
  borderRadius: 20,
  background: 'var(--color-surface-transparent)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '15px 20px',
  boxSizing: 'border-box',
}

const timeRowStyle: React.CSSProperties = {
  width: '100%', minHeight: 72, borderRadius: 20,
  background: 'var(--color-surface-transparent)', border: 'none', padding: '15px 20px',
  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
}

const previewCardStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 20,
  padding: '16px 20px',
  boxSizing: 'border-box',
  background: 'var(--color-surface-transparent)',
  overflow: 'hidden',
}

const warningCardStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 20,
  padding: '16px 20px',
  boxSizing: 'border-box',
  background: 'var(--color-warning-surface-lite)',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
}

const errorCardStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 20,
  padding: '16px 20px',
  boxSizing: 'border-box',
  background: 'var(--color-error-surface-lite)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

function ChevronRightIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--color-interactive-element-secondary)' }}><path d="M6 4L10.5 8L6 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 7.75V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.08 8.58v6.84c0 1.12-.6 2.16-1.57 2.73l-5.94 3.43c-.97.56-2.17.56-3.15 0l-5.94-3.43a3.15 3.15 0 0 1-1.57-2.73V8.58c0-1.12.6-2.16 1.57-2.73l5.94-3.43c.97-.56 2.17-.56 3.15 0l5.94 3.43c.97.57 1.57 1.6 1.57 2.73Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16.2h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
