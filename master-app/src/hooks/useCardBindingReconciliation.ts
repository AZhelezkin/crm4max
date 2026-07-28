import { useEffect, useRef, useState } from 'react'
import { subscriptionApi, type SubscriptionState } from '@/api/subscription.api'

const PENDING_CARD_BINDING_KEY = 'subscription.pendingCardBinding'
const POLL_INTERVAL_MS = 2_000
const POLL_WINDOW_MS = 3 * 60_000
const MARKER_TTL_MS = 20 * 60_000

interface PendingCardBinding {
  baselineCardPan: string | null
  baselineUpdatedAt: string | null
  initiatedAt: number
}

function clearPending() {
  try { sessionStorage.removeItem(PENDING_CARD_BINDING_KEY) } catch { /* storage недоступен */ }
}

function readPending(): PendingCardBinding | null {
  try {
    const value = sessionStorage.getItem(PENDING_CARD_BINDING_KEY)
    if (!value) return null
    const pending = JSON.parse(value) as PendingCardBinding
    if (
      typeof pending.initiatedAt === 'number'
      && Date.now() - pending.initiatedAt <= MARKER_TTL_MS
    ) return pending
    clearPending()
  } catch {
    clearPending()
  }
  return null
}

export function useCardBindingReconciliation(onState: (state: SubscriptionState | null) => void) {
  const onStateRef = useRef(onState)
  onStateRef.current = onState
  const [pending, setPending] = useState<PendingCardBinding | null>(readPending)

  useEffect(() => {
    if (!pending) return
    let stopped = false
    let requestRunning = false
    let interval: number | null = null
    let windowTimeout: number | null = null

    const stopPolling = () => {
      if (interval !== null) window.clearInterval(interval)
      if (windowTimeout !== null) window.clearTimeout(windowTimeout)
      interval = null
      windowTimeout = null
    }
    const finish = () => {
      if (stopped) return
      stopped = true
      stopPolling()
      clearPending()
      setPending(null)
    }
    const bindingUpdated = (state: SubscriptionState) => {
      if (!state.cardPan) return false
      if (state.cardPan !== pending.baselineCardPan) return true
      const updatedAt = Date.parse(state.updatedAt)
      const baselineUpdatedAt = pending.baselineUpdatedAt ? Date.parse(pending.baselineUpdatedAt) : 0
      return state.updatedAt !== pending.baselineUpdatedAt
        && Number.isFinite(updatedAt)
        && updatedAt > baselineUpdatedAt
    }
    const reconcile = async () => {
      if (requestRunning || stopped) return
      if (Date.now() - pending.initiatedAt > MARKER_TTL_MS) {
        finish()
        return
      }
      requestRunning = true
      try {
        const state = await subscriptionApi.getMe()
        if (stopped) return
        onStateRef.current(state)
        if (state && bindingUpdated(state)) finish()
      } catch {
        // Следующий ограниченный poll или lifecycle event повторит синхронизацию.
      } finally {
        requestRunning = false
      }
    }
    const startPollingWindow = () => {
      if (stopped) return
      if (Date.now() - pending.initiatedAt > MARKER_TTL_MS) {
        finish()
        return
      }
      stopPolling()
      void reconcile()
      interval = window.setInterval(() => { void reconcile() }, POLL_INTERVAL_MS)
      windowTimeout = window.setTimeout(stopPolling, POLL_WINDOW_MS)
    }
    const onVisible = () => { if (document.visibilityState === 'visible') startPollingWindow() }
    const onReturn = () => { startPollingWindow() }
    const markerTimeout = window.setTimeout(
      finish,
      Math.max(0, MARKER_TTL_MS - (Date.now() - pending.initiatedAt)),
    )

    startPollingWindow()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onReturn)
    window.addEventListener('pageshow', onReturn)
    return () => {
      stopped = true
      stopPolling()
      window.clearTimeout(markerTimeout)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onReturn)
      window.removeEventListener('pageshow', onReturn)
    }
  }, [pending])

  const begin = (baseline: SubscriptionState | null) => {
    const next = {
      baselineCardPan: baseline?.cardPan ?? null,
      baselineUpdatedAt: baseline?.updatedAt ?? null,
      initiatedAt: Date.now(),
    }
    try { sessionStorage.setItem(PENDING_CARD_BINDING_KEY, JSON.stringify(next)) } catch { /* polling продолжит работать в текущем mount */ }
    setPending(next)
  }
  return { begin, isPending: !!pending }
}
