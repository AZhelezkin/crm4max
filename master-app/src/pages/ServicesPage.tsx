import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ServicesCatalog, { type ServicesCatalogHandle } from '@/components/ServicesCatalog'
import AppHeader from '@/components/AppHeader'

export default function ServicesPage() {
  const navigate = useNavigate()
  const editorRef = useRef<ServicesCatalogHandle>(null)
  const [title, setTitle] = useState('Услуги')

  const handleBack = () => {
    // goBack: false — справочник уже на home → выходим назад.
    if (!editorRef.current?.goBack()) navigate(-1)
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader title={title} onBack={handleBack} />
      <ServicesCatalog
        ref={editorRef}
        onSubStepChange={(ss, catName) =>
          setTitle(
            ss === 'services' ? (catName ?? 'Услуги')
              : ss === 'categories' ? 'Категории услуг'
              : 'Услуги',
          )
        }
      />
    </div>
  )
}
