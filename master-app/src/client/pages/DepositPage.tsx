import { useNavigate, useSearchParams } from 'react-router-dom'
import bridge from '@vkontakte/vk-bridge'
import { useBookingStore } from '@client/store/booking.store'
import PageHeader from '@client/components/PageHeader'
import Card from '@client/components/Card'
import Button from '@client/components/Button'

export default function DepositPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { service } = useBookingStore()
  const bookingId = searchParams.get('bookingId') ?? ''
  const depositAmount = Number(searchParams.get('amount') ?? 0)

  const handlePay = async () => {
    try {
      await bridge.send('VKWebAppOpenPayForm', {
        app_id: Number(import.meta.env.VITE_VK_APP_ID),
        action: 'pay-to-service',
        params: {
          amount: depositAmount,
          description: `Депозит: ${service?.name ?? ''}`,
          payload: JSON.stringify({ bookingId }),
        },
      })
      navigate('/book/success')
    } catch {
      // Пользователь отменил оплату
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-background)' }}>
      <PageHeader title="Депозит" />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 14, color: 'var(--color-on-surface-secondary)', marginBottom: 8 }}>
            Для бронирования требуется депозит
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>
            {(depositAmount / 100).toLocaleString('ru-RU')} ₽
          </div>
        </Card>

        <Button onClick={handlePay} fullWidth>
          Оплатить
        </Button>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', color: 'var(--color-on-surface-secondary)', fontSize: 14 }}
          >
            Правила отмены
          </button>
        </div>
      </div>
    </div>
  )
}
