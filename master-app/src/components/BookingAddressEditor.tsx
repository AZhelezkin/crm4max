import AddressPickerPortal from '@/components/AddressPickerPortal'
import { BookingFlowBottomButton } from '@/components/BookingFlowShell'
import { HeroHeader, FloatingField } from '@/components/onboardingShared'
import type { BookingAddressDetails } from '@/lib/bookingAddress'
import { text } from '@/styles/typography'

interface Props {
  address: string
  details: BookingAddressDetails
  comment: string
  pickerOpen: boolean
  onAddressChange: (address: string) => void
  onDetailsChange: (details: BookingAddressDetails) => void
  onCommentChange: (comment: string) => void
  onPickerOpenChange: (open: boolean) => void
  onBack: () => void
  onSave: () => void
}

export default function BookingAddressEditor({
  address, details, comment, pickerOpen,
  onAddressChange, onDetailsChange, onCommentChange, onPickerOpenChange,
  onBack, onSave,
}: Props) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Адрес, куда нужно выехать" onBack={onBack} />

      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          type="button"
          onClick={() => onPickerOpenChange(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--color-surface-transparent)', borderRadius: 20,
            padding: '16px 20px', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ padding: 10, display: 'inline-flex', flexShrink: 0, color: 'var(--color-on-surface)' }}>
            <LocationAddIcon />
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Адрес клиента</span>
            <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {address || 'Где оказывается услуга'}
            </span>
          </span>
          <span style={{ flexShrink: 0, display: 'inline-flex', color: 'var(--color-interactive-element-secondary)' }}>
            <ChevronRightIcon />
          </span>
        </button>

        <FloatingField
          multiline
          align="top"
          autoGrow
          showCounter
          label="Комментарий"
          value={comment}
          onChange={(value) => onCommentChange(value.slice(0, 300))}
          maxLength={300}
        />
      </div>

      <BookingFlowBottomButton disabled={!address.trim()} onClick={onSave}>Сохранить</BookingFlowBottomButton>

      <AddressPickerPortal
        open={pickerOpen}
        value={address}
        details={details}
        onClose={() => onPickerOpenChange(false)}
        onConfirm={(nextAddress, _coords, nextDetails) => {
          onAddressChange(nextAddress)
          if (nextDetails) onDetailsChange(nextDetails)
        }}
      />
    </div>
  )
}

function LocationAddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 0 1-7.21 0c-2.77-2.66-5.93-6.97-4.77-12.05Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.25 10.5h5.5M12 7.75v5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4L10.5 8L6 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
