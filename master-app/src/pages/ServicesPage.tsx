import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ServicesCatalog, { type ServicesCatalogHandle } from '@/components/ServicesCatalog'
import { HeroHeader } from '@/components/onboardingShared'

export default function ServicesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const editorRef = useRef<ServicesCatalogHandle>(null)
  // Deep-link из флоу записи (макет 10122-41126): «+» → сразу форма создания,
  // карандаш у услуги → сразу её редактор.
  const nav = location.state as { openCreate?: boolean; editServiceId?: string } | null

  const handleBack = () => {
    // goBack: false — плоский список услуг → выходим назад.
    if (!editorRef.current?.goBack()) navigate(-1)
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Услуги" onBack={handleBack} />
      <ServicesCatalog ref={editorRef} openCreateOnMount={nav?.openCreate} editServiceIdOnMount={nav?.editServiceId} />
    </div>
  )
}
