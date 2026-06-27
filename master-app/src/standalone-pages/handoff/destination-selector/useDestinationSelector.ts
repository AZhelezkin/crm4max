import { useCallback, useEffect, useState } from 'react'
import { getDestinationSelectorContext, saveDestinationSelectorAddress } from './api'
import type { DestinationSelectorContextData } from './types'

type LoadState = 'loading' | 'ready' | 'error'
type SaveState = 'idle' | 'saving' | 'saved'

export function useDestinationSelector(token: string | null, enabled = true) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [context, setContext] = useState<DestinationSelectorContextData | null>(null)
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!enabled) return
    if (!token) {
      setLoadState('error')
      setError('Форма недоступна')
      return
    }

    setLoadState('loading')
    setError(null)
    getDestinationSelectorContext(token)
      .then((response) => {
        if (cancelled) return
        if (response.status !== 'ok') {
          setLoadState('error')
          setError(errorText(response.status))
          return
        }
        setContext(response.data)
        setAddress(response.data.clientAddress ?? '')
        setLoadState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setLoadState('error')
        setError('Не удалось открыть форму')
      })

    return () => { cancelled = true }
  }, [enabled, token])

  const save = useCallback(async () => {
    if (!token || saveState === 'saving') return
    const trimmed = address.trim()
    if (!trimmed) {
      setError('Укажите адрес')
      return
    }

    setSaveState('saving')
    setError(null)
    try {
      const response = await saveDestinationSelectorAddress(token, trimmed)
      if (response.status !== 'ok') {
        setSaveState('idle')
        setError(errorText(response.status))
        return
      }
      setSaveState('saved')
      window.setTimeout(() => (window.WebApp as { close?: () => void } | undefined)?.close?.(), 500)
    } catch {
      setSaveState('idle')
      setError('Не удалось сохранить адрес')
    }
  }, [address, saveState, token])

  return { loadState, saveState, context, address, setAddress, error, save }
}

function errorText(status: string): string {
  if (status === 'invalid_address') return 'Проверьте адрес'
  if (status === 'confirmation_send_failed') return 'Не удалось отправить подтверждение в чат'
  if (status === 'forbidden') return 'Форма открыта не для вашего аккаунта'
  if (status === 'expired' || status === 'used' || status === 'stale') return 'Форма устарела'
  return 'Форма недоступна'
}
