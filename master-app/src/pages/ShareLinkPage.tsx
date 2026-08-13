import { useEffect, useRef, useState } from 'react'
import { markGuideStep } from '@/lib/guide'
import { useLocation, useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuthStore } from '@/store/auth.store'
import { colors } from '@/styles/tokens'
import { text } from '@/styles/typography'
import { trackEvent, trackEventOnce } from '@/lib/metrics'
import { renderMiniAppDestination } from '@/lib/miniAppDestinations'
import { miniAppProvider } from '@/lib/miniAppHost'

function BackArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="var(--color-primary-surface)" strokeWidth="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="var(--color-primary-surface)" strokeWidth="2" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 6 12 2 8 6" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="2" x2="12" y2="15" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="7 10 12 15 17 10" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="15" x2="12" y2="3" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ShareLinkPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { master } = useAuthStore()
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Ссылка ведёт в клиент-бот через ?start=<masterId>: у клиент-бота
  // mini-app не зарегистрирован, поэтому используем ?start= — payload приходит
  // в bot_started, бот шлёт клиенту welcome-кнопку «Записаться», открывающую
  // mini-app мастер-бота. Имя клиентского бота переопределяется через VITE_CLIENT_BOT_NAME.
  const masterId = master?.id ?? ''
  const destination = renderMiniAppDestination(miniAppProvider(), { kind: 'client-booking-share', masterId })
  const deepLink = destination.status === 'available' ? destination.url : ''
  const hasLink = destination.status === 'available'

  useEffect(() => {
    trackEventOnce(`share-page:${location.key}`, 'share_page_opened', {})
  }, [location.key])

  const handleCopy = async (source: 'button' | 'fallback' = 'button') => {
    try {
      await navigator.clipboard.writeText(deepLink)
      markGuideStep('shared')
      trackEvent('share_link_copied', { source })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback — выделить текст
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: master?.name ?? 'Записаться ко мне',
          text: `Записывайтесь ко мне через Max: ${master?.name ?? ''}`,
          url: deepLink,
        })
        markGuideStep('shared')
        trackEvent('share_link_sent', { provider: 'system' })
      } catch {
        // пользователь отменил
      }
    } else {
      void handleCopy('fallback')
    }
  }

  const handleDownloadQR = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'qr-code.png'
    a.click()
    trackEvent('share_qr_downloaded', {})
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* Шапка */}
      <div style={{
        height: 76,
        boxSizing: 'border-box',
        display: 'flex', alignItems: 'center',
        padding: '16px 8px 16px 4px',
        position: 'sticky', top: 0,
        background: 'var(--color-background)',
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center' }}
        >
          <BackArrowIcon />
        </button>
        <span style={{ ...text.subheadline, flex: 1 }}>Ссылка для записи</span>
      </div>

      {/* Контент */}
      <div style={{ padding: '8px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Описание */}
        <p style={{ margin: 0, ...text.action, color: 'var(--color-on-surface-secondary)', lineHeight: 1.5 }}>
          Поделитесь этой ссылкой или QR-кодом — клиенты смогут записаться к вам через мессенджер Max
        </p>

        {/* Блок ссылки */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center',
          padding: '12px 16px',
          gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.captionSmall, color: 'var(--color-on-surface-secondary)', marginBottom: 4 }}>Ссылка</div>
            <div style={{
              ...text.footnote, fontFamily: 'monospace',
              color: 'var(--color-primary-surface)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {deepLink}
            </div>
          </div>

          {/* Кнопка поделиться */}
          <button
            onClick={handleShare}
            disabled={!hasLink}
            style={{
              flexShrink: 0,
              background: 'none', border: 'none',
              cursor: 'pointer', padding: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
              transition: 'background 0.15s',
            }}
            title="Поделиться"
          >
            <ShareIcon />
          </button>
        </div>

        {/* Кнопка копирования */}
          <button
            onClick={() => { void handleCopy('button') }}
            disabled={!hasLink}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: copied ? 'var(--color-secondary-surface)' : 'var(--color-surface)',
            border: `1px solid ${copied ? 'var(--color-primary-surface)' : 'transparent'}`,
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            cursor: 'pointer',
            color: copied ? 'var(--color-primary-surface)' : 'var(--color-on-surface)',
            ...text.bodyMedium,
            transition: 'all 0.15s',
          }}
        >
          <CopyIcon />
          {copied ? 'Скопировано!' : 'Скопировать ссылку'}
        </button>

        {/* Разделитель */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-divider-low)' }} />
          <span style={{ ...text.footnote, color: 'var(--color-on-surface-secondary)' }}>или QR-код</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-divider-low)' }} />
        </div>

        {/* QR-код */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 16px 20px',
          gap: 16,
        }}>
          <div style={{
            background: colors.black00,
            borderRadius: 16,
            padding: 16,
            display: 'inline-flex',
          }}>
            {hasLink ? (
              <QRCodeCanvas
                ref={canvasRef}
                value={deepLink}
                size={200}
                bgColor={colors.black00}
                fgColor={colors.black100}
                level="M"
              />
            ) : (
              <div style={{
                width: 200, height: 200,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-on-surface-muted)', ...text.footnote, textAlign: 'center', padding: 16,
              }}>
                QR-код появится после авторизации
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ ...text.action, marginBottom: 4 }}>
              {master?.name ?? 'Мастер'}
            </div>
            <div style={{ ...text.caption, color: 'var(--color-on-surface-secondary)' }}>
              Отсканируйте, чтобы записаться
            </div>
          </div>

          {/* Скачать QR */}
          <button
            onClick={handleDownloadQR}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: '1px solid var(--color-divider-low)',
              borderRadius: 10, padding: '8px 16px',
              cursor: 'pointer',
              color: 'var(--color-on-surface-secondary)',
              ...text.footnote,
            }}
          >
            <DownloadIcon />
            Скачать QR-код
          </button>
        </div>

      </div>
    </div>
  )
}
