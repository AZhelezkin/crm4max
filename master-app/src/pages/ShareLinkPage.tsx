import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '@/store/auth.store'

function BackArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="var(--color-primary)" strokeWidth="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="var(--color-primary)" strokeWidth="2" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 6 12 2 8 6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="2" x2="12" y2="15" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="7 10 12 15 17 10" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="15" x2="12" y2="3" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ShareLinkPage() {
  const navigate = useNavigate()
  const { master } = useAuthStore()
  const [copied, setCopied] = useState(false)

  const masterId = master?.id ?? ''
  const deepLink = `https://max.ru/id9706002253_bot?startapp=${masterId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deepLink)
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
      } catch {
        // пользователь отменил
      }
    } else {
      handleCopy()
    }
  }

  const handleDownloadQR = () => {
    const svg = document.getElementById('master-qr-svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qr-code.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Шапка */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '12px 8px 12px 4px',
        position: 'sticky', top: 0,
        background: 'var(--color-bg)',
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center' }}
        >
          <BackArrowIcon />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, flex: 1 }}>Ссылка для записи</span>
      </div>

      {/* Контент */}
      <div style={{ padding: '8px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Описание */}
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Поделитесь этой ссылкой или QR-кодом — клиенты смогут записаться к вам через мессенджер Max
        </p>

        {/* Блок ссылки */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center',
          padding: '12px 16px',
          gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Ссылка</div>
            <div style={{
              fontSize: 13, fontFamily: 'monospace',
              color: 'var(--color-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {deepLink}
            </div>
          </div>

          {/* Кнопка поделиться */}
          <button
            onClick={handleShare}
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
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: copied ? 'var(--color-card2)' : 'var(--color-card)',
            border: `1px solid ${copied ? 'var(--color-primary)' : 'transparent'}`,
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            cursor: 'pointer',
            color: copied ? 'var(--color-primary)' : 'var(--color-text)',
            fontSize: 15, fontWeight: 500,
            transition: 'all 0.15s',
          }}
        >
          <CopyIcon />
          {copied ? 'Скопировано!' : 'Скопировать ссылку'}
        </button>

        {/* Разделитель */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>или QR-код</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        {/* QR-код */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 'var(--radius)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 16px 20px',
          gap: 16,
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: 16,
            display: 'inline-flex',
          }}>
            <QRCodeSVG
              id="master-qr-svg"
              value={deepLink}
              size={200}
              bgColor="#ffffff"
              fgColor="#0F0F11"
              level="M"
              includeMargin={false}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              {master?.name ?? 'Мастер'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Отсканируйте, чтобы записаться
            </div>
          </div>

          {/* Скачать QR */}
          <button
            onClick={handleDownloadQR}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: '1px solid var(--color-border)',
              borderRadius: 10, padding: '8px 16px',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontSize: 13, fontWeight: 500,
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
