import { useEffect } from 'react'
import AddressSuggestField from '@client/components/AddressSuggestField'
import { BookingFlowBottomButton, BookingFlowToolbar, CloseIcon } from '@/components/BookingFlowShell'
import { useAuthStore } from '@/store/auth.store'
import { useDestinationSelector } from './useDestinationSelector'

interface Props {
  token: string | null
}

export default function DestinationSelectorPage({ token }: Props) {
  const init = useAuthStore((state) => state.init)
  const authLoading = useAuthStore((state) => state.isLoading)
  const { loadState, saveState, address, setAddress, save } = useDestinationSelector(token, !authLoading)
  const canContinue = loadState === 'ready' && saveState !== 'saving' && saveState !== 'saved' && Boolean(address.trim())

  useEffect(() => {
    window.WebApp?.ready?.()
    void init()
  }, [init])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <BookingFlowToolbar
        onBack={() => (window.WebApp as { close?: () => void } | undefined)?.close?.()}
        backIcon={<CloseIcon />}
        backAriaLabel="Закрыть"
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AddressSuggestField
          value={address}
          onChange={setAddress}
          label="Укажите адрес клиента"
          placeholder="Улица, дом, квартира"
        />
      </div>

      <BookingFlowBottomButton disabled={!canContinue} onClick={() => { void save() }}>
        {saveState === 'saving' ? 'Сохраняем…' : 'Продолжить'}
      </BookingFlowBottomButton>
    </div>
  )
}
