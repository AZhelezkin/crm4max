import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CategoriesServicesEditor, { type CategoriesServicesEditorHandle } from '@/components/CategoriesServicesEditor'
import AppHeader from '@/components/AppHeader'

export default function ServicesPage() {
  const navigate = useNavigate()
  const editorRef = useRef<CategoriesServicesEditorHandle>(null)
  const [title, setTitle] = useState('Категории услуг')

  const handleBack = () => {
    if (editorRef.current?.subStep === 'services') {
      editorRef.current.goToCategories()
    } else {
      navigate(-1)
    }
  }

  return (
    <div style={{ height: '100dvh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader title={title} onBack={handleBack} />
      <CategoriesServicesEditor
        ref={editorRef}
        onSubStepChange={(ss, catName) =>
          setTitle(ss === 'services' ? (catName ?? 'Услуги') : 'Категории услуг')
        }
      />
    </div>
  )
}
