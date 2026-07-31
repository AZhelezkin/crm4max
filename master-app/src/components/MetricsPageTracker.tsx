import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView, type AppMode } from '@/lib/metrics'

export default function MetricsPageTracker({ appMode }: { appMode: AppMode }) {
  const location = useLocation()

  useEffect(() => {
    // Redirect guards render a transient location; defer one task so only the
    // destination screen becomes a page view. StrictMode cleanup cancels its
    // first mount as well.
    const timeout = window.setTimeout(() => {
      trackPageView(location.pathname, appMode, location.key)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [appMode, location.key, location.pathname])

  return null
}
