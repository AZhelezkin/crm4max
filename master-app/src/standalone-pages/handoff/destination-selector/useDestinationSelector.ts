import { useCallback, useEffect, useState } from 'react'
import { formatStructuredBookingAddress, parseBookingAddress, type BookingAddressDetails } from '@/lib/bookingAddress'
import { getDestinationSelectorContext, saveDestinationSelectorAddress, saveDestinationSelectorMasterLocation } from './api'
import type { DestinationSelectorContextData, DestinationSelectorCoords } from './types'

type LoadState = 'loading' | 'ready' | 'error'
type SaveState = 'idle' | 'saving' | 'saved'
const EMPTY_DETAILS: BookingAddressDetails = { floor: '', apartment: '', intercom: '' }
const MAX_DESTINATION_ADDRESS_LENGTH = 500
const MAX_COMMENT_LENGTH = 300

export function useDestinationSelector(token: string | null, enabled = true) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [context, setContext] = useState<DestinationSelectorContextData | null>(null)
  const [address, setAddress] = useState('')
  const [details, setDetails] = useState<BookingAddressDetails>(EMPTY_DETAILS)
  const [comment, setComment] = useState('')
  const [initialAddress, setInitialAddress] = useState<{ raw: string; parsed: ReturnType<typeof parseBookingAddress> } | null>(null)
  const [coords, setCoords] = useState<DestinationSelectorCoords | null>(null)
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
    setInitialAddress(null)
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
        if (response.data.addressPurpose === 'master_location') {
          setInitialAddress(null)
          setAddress(response.data.masterLocation ?? '')
          setDetails(EMPTY_DETAILS)
          setComment('')
          setCoords(typeof response.data.masterLat === 'number' && typeof response.data.masterLng === 'number'
            ? { lat: response.data.masterLat, lng: response.data.masterLng }
            : null)
        } else {
          const rawAddress = response.data.clientAddress ?? ''
          const parsedAddress = parseBookingAddress(rawAddress)
          setInitialAddress({ raw: rawAddress, parsed: parsedAddress })
          setAddress(parsedAddress.address)
          setDetails({ floor: parsedAddress.floor, apartment: parsedAddress.apartment, intercom: parsedAddress.intercom })
          setComment(parsedAddress.comment)
          setCoords(null)
        }
        setLoadState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setLoadState('error')
        setError('Не удалось открыть форму')
      })

    return () => { cancelled = true }
  }, [enabled, token])

  const addressIsUnchanged = Boolean(initialAddress)
    && address === initialAddress!.parsed.address
    && details.floor === initialAddress!.parsed.floor
    && details.apartment === initialAddress!.parsed.apartment
    && details.intercom === initialAddress!.parsed.intercom
    && comment === initialAddress!.parsed.comment
  const clientAddress = addressIsUnchanged ? initialAddress!.raw : formatStructuredBookingAddress(address, details, comment)
  const masterLocationMode = context?.addressPurpose === 'master_location'
  const isCommentTooLong = !masterLocationMode && !addressIsUnchanged && comment.length > MAX_COMMENT_LENGTH
  const isAddressTooLong = (masterLocationMode ? address.trim() : clientAddress).length > MAX_DESTINATION_ADDRESS_LENGTH

  const save = useCallback(async () => {
    if (!token || saveState === 'saving') return
    if (!address.trim()) {
      setError('Укажите адрес')
      return
    }
    if (isCommentTooLong) {
      setError('Сократите комментарий до 300 символов')
      return
    }
    if (isAddressTooLong) {
      setError('Сократите адрес или комментарий до 500 символов')
      return
    }

    setSaveState('saving')
    setError(null)
    try {
      const response = masterLocationMode
        ? await saveDestinationSelectorMasterLocation(token, {
            location: address.trim(),
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
          })
        : await saveDestinationSelectorAddress(token, clientAddress)
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
  }, [address, clientAddress, coords, isAddressTooLong, isCommentTooLong, masterLocationMode, saveState, token])

  const changeAddress = useCallback((value: string) => {
    setAddress(value)
    setCoords(null)
    setError(null)
  }, [])

  const selectAddress = useCallback((value: string, nextCoords: DestinationSelectorCoords | null) => {
    setAddress(value)
    setCoords(nextCoords)
    setError(null)
  }, [])

  return {
    loadState,
    saveState,
    context,
    address,
    coords,
    setAddress: changeAddress,
    selectAddress,
    details,
    setFloor: (floor: string) => { setDetails((current) => ({ ...current, floor })); setError(null) },
    setApartment: (apartment: string) => { setDetails((current) => ({ ...current, apartment })); setError(null) },
    setIntercom: (intercom: string) => { setDetails((current) => ({ ...current, intercom })); setError(null) },
    comment,
    setComment: (value: string) => { setComment(value.slice(0, MAX_COMMENT_LENGTH)); setError(null) },
    isCommentTooLong,
    isAddressTooLong,
    error,
    save,
  }
}

function errorText(status: string): string {
  if (status === 'invalid_address') return 'Проверьте адрес'
  if (status === 'confirmation_send_failed') return 'Не удалось отправить подтверждение в чат'
  if (status === 'forbidden') return 'Форма открыта не для вашего аккаунта'
  if (status === 'expired' || status === 'used' || status === 'stale') return 'Форма устарела'
  return 'Форма недоступна'
}
