import { useState } from 'react'
import AddressPickerPortal from '@/components/AddressPickerPortal'

/**
 * Изолированная страница для отладки карты Yandex Maps v3.
 * Доступна по URL https://azhelezkin.github.io/crm4max/#/map-test
 * без проверки `start_param=mmode`, так что можно тестировать в обычном браузере.
 */
export default function MapTestPage() {
  const [open, setOpen] = useState(true)
  const [address, setAddress] = useState('')

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0F0F11',
        color: '#D3D4D6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        textAlign: 'center',
        gap: 16,
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600 }}>Map test page</div>
      <div style={{ fontSize: 13, color: '#8E8E93', maxWidth: 320 }}>
        Выбранный адрес: <b style={{ color: '#fff' }}>{address || '—'}</b>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: '#007AFE',
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          padding: '12px 24px',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Открыть выбор адреса
      </button>

      <AddressPickerPortal
        open={open}
        value={address}
        onClose={() => setOpen(false)}
        onConfirm={(picked) => setAddress(picked)}
      />
    </div>
  )
}
