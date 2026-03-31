import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { mastersApi } from '@/api/masters.api'
import PageHeader from '@/components/PageHeader'
import Input from '@/components/Input'
import Button from '@/components/Button'
import Card from '@/components/Card'

export default function PaymentSettingsPage() {
  const { master, setMaster } = useAuthStore()

  const [cardNumber, setCardNumber] = useState(master?.cardNumber ?? '')
  const [saving, setSaving]         = useState(false)

  const handleSaveCard = async () => {
    setSaving(true)
    try {
      const updated = await mastersApi.updatePayment({ cardNumber })
      setMaster({ ...master!, ...updated })
    } finally {
      setSaving(false)
    }
  }

  const handleLinkVkPay = async () => {
    setSaving(true)
    try {
      const updated = await mastersApi.updatePayment({ vkPayLinked: true })
      setMaster({ ...master!, ...updated })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="Карта для оплаты" />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <Input
            label="Номер карты"
            value={cardNumber}
            onChange={setCardNumber}
            placeholder="0000 0000 0000 0000"
            type="tel"
          />
          <Button onClick={handleSaveCard} disabled={saving} fullWidth style={{ marginTop: 12 }}>
            Сохранить
          </Button>
        </Card>

        <Card style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }}>
            {master?.vkPayLinked ? '✅ VK Pay привязан' : 'Привяжите VK Pay для приёма оплат'}
          </div>
          {!master?.vkPayLinked && (
            <Button variant="secondary" onClick={handleLinkVkPay} disabled={saving} fullWidth>
              Привязать VK Pay
            </Button>
          )}
        </Card>
      </div>
    </div>
  )
}
