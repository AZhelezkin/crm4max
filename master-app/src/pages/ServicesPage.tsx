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
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader
        title="Услуги"
        onBack={handleBack}
        trailing={
          // Пилюля-группа «+ / поиск» (макет «Список услуг» 10304-43086).
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 4, background: 'var(--color-background)', borderRadius: 22 }}>
            <button type="button" aria-label="Добавить услугу" onClick={() => editorRef.current?.openCreate()}
              style={headerIconBtn}>
              <AddIcon />
            </button>
            <button type="button" aria-label="Поиск" onClick={() => editorRef.current?.toggleSearch()}
              style={headerIconBtn}>
              <SearchIcon />
            </button>
          </div>
        }
      />
      <ServicesCatalog ref={editorRef} hideAddButton documentScroll />
    </div>
  )
}

const headerIconBtn: React.CSSProperties = {
  padding: 6, background: 'none', border: 'none', cursor: 'pointer',
  display: 'inline-flex', color: 'var(--color-on-surface)',
}

// vuesax/linear/add (24×24).
function AddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 12h12M12 6v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/search-normal (24×24).
function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11.5 21a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM22 22l-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
