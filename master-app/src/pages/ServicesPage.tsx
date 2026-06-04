import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ServicesCatalog, { type ServicesCatalogHandle } from '@/components/ServicesCatalog'
import AppHeader from '@/components/AppHeader'

export default function ServicesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const editorRef = useRef<ServicesCatalogHandle>(null)
  const [title, setTitle] = useState('Услуги')

  // Deep-link с карточки мастера (тап «Услуги без категории») → сразу список этих услуг.
  useEffect(() => {
    if ((location.state as { openUncategorized?: boolean } | null)?.openUncategorized) {
      editorRef.current?.openUncategorized()
    }
  }, [])

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
