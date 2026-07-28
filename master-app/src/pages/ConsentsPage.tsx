import { useNavigate } from 'react-router-dom'
import { HeroHeader } from '@/components/onboardingShared'
import { OFFER_URL, PERSONAL_DATA_URL, openLegalDocument } from '@/lib/legalDocuments'
import { text } from '@/styles/typography'

const documents = [
  { title: 'Оферта', url: OFFER_URL },
  { title: 'Персональные данные', url: PERSONAL_DATA_URL },
]

export default function ConsentsPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Согласия" onBack={() => navigate(-1)} />

      <div style={{ padding: '4px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents.map((document) => (
          <div
            key={document.title}
            style={{
              width: '100%', background: 'var(--color-surface-transparent)', borderRadius: 20,
              boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.1)', overflow: 'hidden',
            }}
          >
            <div style={{ padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
              <span style={{ ...text.callout1, color: 'var(--color-on-surface)', textAlign: 'center' }}>
                {document.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openLegalDocument(document.url)}
              style={{
                width: '100%', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <span style={{ ...text.body2, color: 'var(--color-primary-surface)' }}>Прочитать</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
