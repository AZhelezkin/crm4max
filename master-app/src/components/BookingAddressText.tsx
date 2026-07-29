import { parseBookingAddress } from '@/lib/bookingAddress'
import { text } from '@/styles/typography'

export default function BookingAddressText({ value }: { value: string }) {
  const parsed = parseBookingAddress(value)
  const access = [
    parsed.floor && `${parsed.floor} этаж`,
    parsed.intercom && `домофон ${parsed.intercom}`,
  ].filter(Boolean).join(', ')

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
        {parsed.address}
      </div>
      {parsed.apartment && (
        <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>кв. {parsed.apartment}</div>
      )}
      {parsed.comment && (
        <div style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
          {parsed.comment}
        </div>
      )}
      {access && (
        <div style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)' }}>{access}</div>
      )}
    </div>
  )
}
