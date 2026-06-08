import { useEffect, useRef, useState } from 'react'
import { paymentsApi } from '@/api/payments.api'
import type { ExportToastData } from '@/components/ExportToast'

// Гesture-safe экспорт xlsx через Max WebApp.downloadFile.
//
// downloadFile требует активного user-gesture (клика) и не переживает await,
// поэтому pre-signed URL тянем заранее (на маунте, при смене date и после
// «протухания» ~4 мин), а на клике синхронно отдаём его нативному мосту.
//
// date (YYYY-MM-DD) — детализация за один день; без даты — все оплаты.
export function usePaymentsExport(date?: string) {
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<ExportToastData>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exportRef = useRef<{ url: string; filename: string; fetchedAt: number } | null>(null)

  const showToast = (t: ExportToastData) => {
    setToast(t)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    if (t) toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const fetchExportUrl = async () => {
    try {
      const res = await paymentsApi.exportXlsx(date)
      exportRef.current = { ...res, fetchedAt: Date.now() }
    } catch (err) {
      console.error('[payments] pre-fetch export url failed', err)
      exportRef.current = null
    }
  }

  useEffect(() => {
    // URL зависит от date — при смене дня обновляем и сбрасываем устаревший.
    exportRef.current = null
    fetchExportUrl()
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const handleExport = () => {
    if (exporting) return
    const fresh = exportRef.current && Date.now() - exportRef.current.fetchedAt < 4 * 60 * 1000
    if (fresh && exportRef.current) {
      // Синхронный вызов внутри click handler — Max-мост видит user gesture.
      const { url, filename } = exportRef.current
      try {
        const ret = window.WebApp?.downloadFile?.(url, filename) as
          | Promise<{ status?: string }>
          | undefined
        if (ret && typeof ret.then === 'function') {
          ret.then(
            (r) => {
              if (r?.status === 'downloading') {
                showToast({ kind: 'success', text: 'Файл сохранён в папку Max' })
              }
              // status === 'cancelled' — пользователь передумал, молчим.
            },
            (e) => {
              console.error('[payments] downloadFile rejected', e)
              showToast({ kind: 'error', text: 'Не удалось скачать файл. Попробуйте ещё раз.' })
            },
          )
        }
      } catch (err) {
        console.error('[payments] downloadFile threw', err)
        showToast({ kind: 'error', text: 'Не удалось скачать файл.' })
      }
      // Сразу готовим URL под следующее нажатие.
      fetchExportUrl()
      return
    }
    // URL не готов — тянем и просим кликнуть ещё раз.
    setExporting(true)
    fetchExportUrl().finally(() => {
      setExporting(false)
      showToast({ kind: 'success', text: 'Файл готов — нажмите «Скачать» ещё раз' })
    })
  }

  return { exporting, handleExport, toast, dismissToast: () => setToast(null) }
}
