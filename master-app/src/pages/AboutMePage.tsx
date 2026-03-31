import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { mastersApi } from '@/api/masters.api'
import PageHeader from '@/components/PageHeader'
import Input from '@/components/Input'
import Button from '@/components/Button'

export default function AboutMePage() {
  const { master, setMaster } = useAuthStore()

  const [name, setName]           = useState(master?.name ?? '')
  const [contacts, setContacts]   = useState(master?.contacts ?? '')
  const [description, setDescription] = useState(master?.description ?? '')
  const [location, setLocation]   = useState(master?.location ?? '')
  const [saving, setSaving]       = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await mastersApi.updateProfile({ name, contacts, description, location })
      setMaster({ ...master!, ...updated })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="Обо мне" />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Имя" value={name} onChange={setName} placeholder="Ваше имя" />
        <Input label="Контакты" value={contacts} onChange={setContacts} placeholder="Телефон или ссылка" />
        <Input label="Локация" value={location} onChange={setLocation} placeholder="Адрес или район" />
        <Input label="Описание" value={description} onChange={setDescription} placeholder="Расскажите о себе" multiline />

        <Button onClick={handleSave} disabled={saving} fullWidth>
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  )
}
