import { parseBookingAddress } from '@/lib/bookingAddress'
import { text } from '@/styles/typography'

export default function BookingAddressText({ value, note }: { value: string; note?: string | null }) {
  const parsed = parseBookingAddress(value, note)
  const access = [
    parsed.entrance && `подъезд ${parsed.entrance}`,
    parsed.intercom && `домофон ${parsed.intercom}`,
    parsed.floor && `${parsed.floor} этаж`,
    parsed.apartment && `кв./офис ${parsed.apartment}`,
  ].filter(Boolean).join(', ')

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
        {parsed.address}
      </div>
      {access && (
        <div style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
          {access}
        </div>
      )}
      {parsed.comment && (
        <div style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
          {parsed.comment}
        </div>
      )}
    </div>
  )
}
