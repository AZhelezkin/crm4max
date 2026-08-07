import { BookingFlowBottomButton } from '@/components/BookingFlowShell'
import { HeroHeader, FloatingField } from '@/components/onboardingShared'
import { normalizeOnlineMeetingLink, ONLINE_MEETING_LINK_MAX_LENGTH } from '@/lib/onlineMeetingLink'

interface Props {
  value: string
  onChange: (value: string) => void
  onBack: () => void
  onSave: () => void
}

export default function BookingOnlineLinkEditor({ value, onChange, onBack, onSave }: Props) {
  const normalized = normalizeOnlineMeetingLink(value)

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Ссылка на онлайн-встречу" onBack={onBack} />

      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FloatingField
          label="Ссылка в формате https://"
          value={value}
          onChange={onChange}
          type="url"
          inputMode="url"
          maxLength={ONLINE_MEETING_LINK_MAX_LENGTH}
          autoFocus
          error={value.length > 0 && !normalized}
        />
      </div>

      <BookingFlowBottomButton disabled={!normalized} onClick={onSave}>Сохранить</BookingFlowBottomButton>
    </div>
  )
}
