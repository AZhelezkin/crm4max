import { text } from '@/styles/typography'
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

export type TimeWheelTone = 'success' | 'warning' | 'error' | 'muted'

const ROW_HEIGHT = 30
const VISIBLE_ROWS = 7
const WHEEL_PADDING = (VISIBLE_ROWS * ROW_HEIGHT - ROW_HEIGHT) / 2
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export default function TimeWheelPicker({ open, value, minTime, getTone, isSelectable = () => true, onSelect, onClose }: {
  open: boolean
  value: string
  minTime?: string
  getTone: (value: string) => TimeWheelTone
  isSelectable?: (value: string) => boolean
  onSelect: (value: string) => void
  onClose: () => void
}) {
  const [minimumHour = '00', minimumMinute = '00'] = (minTime ?? '00:00').split(':')
  const availableHours = HOURS.filter((hour) => hour >= minimumHour)
  const [initialHour = availableHours[0], initialMinute = '00'] = value.split(':')
  const hourRef = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLDivElement>(null)
  const [hourIndex, setHourIndex] = useState(Math.max(0, availableHours.indexOf(initialHour)))
  const initialMinutes = initialHour === minimumHour ? MINUTES.filter((minute) => minute >= minimumMinute) : MINUTES
  const [minuteIndex, setMinuteIndex] = useState(Math.max(0, initialMinutes.indexOf(initialMinute)))
  const selectedHour = availableHours[hourIndex]
  const availableMinutes = selectedHour === minimumHour
    ? MINUTES.filter((minute) => minute >= minimumMinute)
    : MINUTES
  const selectedMinute = availableMinutes[minuteIndex] ?? availableMinutes[0]

  useLayoutEffect(() => {
    if (!open) return
    const nextHour = Math.max(0, availableHours.indexOf(initialHour))
    const nextMinutes = initialHour === minimumHour ? MINUTES.filter((minute) => minute >= minimumMinute) : MINUTES
    const nextMinute = Math.max(0, nextMinutes.indexOf(initialMinute))
    setHourIndex(nextHour)
    setMinuteIndex(nextMinute)
    if (hourRef.current) hourRef.current.scrollTop = nextHour * ROW_HEIGHT
    if (minuteRef.current) minuteRef.current.scrollTop = nextMinute * ROW_HEIGHT
  }, [initialHour, initialMinute, minTime, open])

  if (!open) return null

  const rowStyle = (distance: number, tone: TimeWheelTone): CSSProperties => ({
    height: ROW_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    scrollSnapAlign: 'center',
    fontSize: distance === 0 ? 23 : distance === 1 ? 18 : distance === 2 ? 14 : 12,
    lineHeight: 1,
    fontWeight: distance === 0 ? 600 : 400,
    color: tone === 'warning'
      ? 'var(--color-warning-surface-accented)'
      : tone === 'error'
        ? 'var(--color-error-surface-accented)'
        : tone === 'muted'
          ? 'var(--color-on-surface-muted)'
        : 'var(--color-success-surface-accented)',
    opacity: distance === 0 ? 1 : distance === 1 ? 0.85 : distance === 2 ? 0.72 : 0.6,
    cursor: 'pointer',
    transition: 'font-size 0.12s, opacity 0.12s',
  })

  const renderColumn = (
    values: string[],
    centerIndex: number,
    ref: React.RefObject<HTMLDivElement>,
    setCenterIndex: (index: number) => void,
    toTime: (part: string) => string,
    label: string,
    neutral = false,
  ) => (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      onScroll={() => {
        const element = ref.current
        if (!element) return
        setCenterIndex(Math.min(values.length - 1, Math.max(0, Math.round(element.scrollTop / ROW_HEIGHT))))
      }}
      style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        padding: `${WHEEL_PADDING}px 0`,
        boxSizing: 'border-box',
        scrollbarWidth: 'none',
      }}
    >
      {values.map((part, index) => (
        <div
          key={part}
          role="option"
          aria-selected={index === centerIndex}
          onClick={() => ref.current?.scrollTo({ top: index * ROW_HEIGHT, behavior: 'smooth' })}
          style={{
            ...rowStyle(Math.abs(index - centerIndex), getTone(toTime(part))),
            color: neutral ? 'var(--color-on-surface)' : rowStyle(Math.abs(index - centerIndex), getTone(toTime(part))).color,
          }}
        >
          {part}
        </div>
      ))}
    </div>
  )

  const selectedTime = `${selectedHour}:${selectedMinute}`

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: 'var(--color-background)',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          paddingBottom: 'calc(48px + env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ position: 'relative', height: VISIBLE_ROWS * ROW_HEIGHT, width: '100%' }}>
          <div style={{
            position: 'absolute', left: 20, right: 20,
            top: '50%', height: ROW_HEIGHT, transform: 'translateY(-50%)',
            borderTop: '1px solid var(--color-divider-low)',
            borderBottom: '1px solid var(--color-divider-low)',
            pointerEvents: 'none',
          }} />
          <div style={{ height: '100%', display: 'flex' }}>
            {renderColumn(availableHours, hourIndex, hourRef, setHourIndex, (hour) => `${hour}:${selectedMinute}`, 'Часы', true)}
            {renderColumn(availableMinutes, minuteIndex, minuteRef, setMinuteIndex, (minute) => `${selectedHour}:${minute}`, 'Минуты')}
          </div>
        </div>
        <div style={{ width: '100%', padding: '0 12px', boxSizing: 'border-box' }}>
          <button
            type="button"
            disabled={!isSelectable(selectedTime)}
            onClick={() => { onSelect(selectedTime); onClose() }}
            style={{
              width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...text.callout1, cursor: isSelectable(selectedTime) ? 'pointer' : 'default',
              background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)',
              opacity: isSelectable(selectedTime) ? 1 : 0.5,
            }}
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
