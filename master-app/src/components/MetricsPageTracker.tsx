import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { setMetricsConsent, trackPageView, type AppMode } from '@/lib/metrics'

export default function MetricsPageTracker({ appMode, enabled }: { appMode: AppMode; enabled: boolean }) {
  const location = useLocation()

  useEffect(() => {
    if (!enabled) return
    setMetricsConsent(true)
    // Redirect guards render a transient location; defer one task so only the
    // destination screen becomes a page view. StrictMode cleanup cancels its
    // first mount as well.
    const timeout = window.setTimeout(() => {
      trackPageView(location.pathname, appMode, location.key)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [appMode, enabled, location.key, location.pathname])

  return null
}
