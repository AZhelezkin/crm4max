import { useNavigate } from 'react-router-dom'
import bridge from '@vkontakte/vk-bridge'
import { useBookingStore } from '@/store/booking.store'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import Button from '@/components/Button'

interface Props {
  bookingId: string
  depositAmount: number
}

export default function DepositPage({ bookingId, depositAmount }: Props) {
  const navigate = useNavigate()
  const { service } = useBookingStore()

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
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="Депозит" />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            Для бронирования требуется депозит
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>
            {(depositAmount / 100).toLocaleString('ru-RU')} ₽
          </div>
        </Card>

        <Button onClick={handlePay} fullWidth>
          Оплатить через VK Pay
        </Button>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', color: 'var(--color-text-secondary)', fontSize: 14 }}
          >
            Правила отмены
          </button>
        </div>
      </div>
    </div>
  )
}
