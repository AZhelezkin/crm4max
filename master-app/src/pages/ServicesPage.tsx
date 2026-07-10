import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ServicesCatalog, { type ServicesCatalogHandle } from '@/components/ServicesCatalog'
import { HeroHeader } from '@/components/onboardingShared'

export default function ServicesPage() {
  const navigate = useNavigate()
  const editorRef = useRef<ServicesCatalogHandle>(null)

  const handleBack = () => {
    // goBack: false — плоский список услуг → выходим назад.
    if (!editorRef.current?.goBack()) navigate(-1)
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Услуги" onBack={handleBack} />
      <ServicesCatalog ref={editorRef} />
    </div>
  )
}
