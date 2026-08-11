import { useEffect, useState } from 'react'
import AddressSuggestField from '@client/components/AddressSuggestField'
import AddressPickerPortal from '@/components/AddressPickerPortal'
import { BookingFlowBottomButton, BookingFlowToolbar, CloseIcon } from '@/components/BookingFlowShell'
import { FloatingField } from '@/components/onboardingShared'
import { text } from '@/styles/typography'
import { useAuthStore } from '@/store/auth.store'
import { useDestinationSelector } from './useDestinationSelector'

interface Props {
  token: string | null
}

export default function DestinationSelectorPage({ token }: Props) {
  const init = useAuthStore((state) => state.init)
  const authLoading = useAuthStore((state) => state.isLoading)
  const {
    loadState,
    saveState,
    context,
    address,
    setAddress,
    selectAddress,
    details,
    setFloor,
    setApartment,
    setIntercom,
    comment,
    setComment,
    isCommentTooLong,
    isAddressTooLong,
    error,
    save,
  } = useDestinationSelector(token, !authLoading)
  const [pickerOpen, setPickerOpen] = useState(false)
  const masterLocation = context?.addressPurpose === 'master_location'
  const canContinue = loadState === 'ready' && saveState !== 'saving' && saveState !== 'saved' && Boolean(address.trim()) && !isCommentTooLong && !isAddressTooLong
  const fieldsDisabled = loadState !== 'ready' || saveState !== 'idle'
  const visibleError = isCommentTooLong ? 'Сократите комментарий до 300 символов' : isAddressTooLong ? 'Сократите адрес или комментарий до 500 символов' : error

  useEffect(() => {
    window.WebApp?.ready?.()
    void init()
  }, [init])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <BookingFlowToolbar
        title={masterLocation ? 'Адрес мастера' : 'Адрес клиента'}
        onBack={() => (window.WebApp as { close?: () => void } | undefined)?.close?.()}
        backIcon={<CloseIcon />}
        backAriaLabel="Закрыть"
        titleHeadingLevel={1}
      />

      <div aria-busy={loadState === 'loading' || saveState === 'saving'} style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <fieldset disabled={fieldsDisabled} style={{ display: 'contents' }}>
          <AddressSuggestField
            value={address}
            onChange={setAddress}
            onPickerOpen={masterLocation ? () => setPickerOpen(true) : undefined}
            label={masterLocation ? 'Укажите адрес мастера' : 'Укажите адрес клиента'}
            placeholder={masterLocation ? 'Улица, дом' : 'Город, улица, дом'}
          />
          {!masterLocation && (
            <>
              <div role="heading" aria-level={2} style={{ ...text.callout1, color: 'var(--color-on-surface)', textAlign: 'center' }}>Дополнительно</div>
              <FloatingField label="Этаж" value={details.floor} onChange={setFloor} valueBold />
              <FloatingField label="Квартира/офис" value={details.apartment} onChange={setApartment} valueBold />
              <FloatingField label="Домофон" value={details.intercom} onChange={setIntercom} valueBold />
              <FloatingField
                multiline
                align="top"
                autoGrow
                showCounter
                label="Комментарий"
                value={comment}
                onChange={setComment}
                maxLength={300}
              />
            </>
          )}
        </fieldset>
        {visibleError && (
          <div role="alert" aria-live="polite" style={{ ...text.footnote, color: 'var(--color-error-surface-accented)', textAlign: 'center' }}>
            {visibleError}
          </div>
        )}
      </div>

      <BookingFlowBottomButton disabled={!canContinue} onClick={() => { void save() }}>
        {saveState === 'saving' ? 'Сохраняем…' : 'Продолжить'}
      </BookingFlowBottomButton>

      <AddressPickerPortal
        open={pickerOpen}
        value={address}
        onClose={() => setPickerOpen(false)}
        onConfirm={(nextAddress, nextCoords) => selectAddress(nextAddress, nextCoords)}
      />
    </div>
  )
}
