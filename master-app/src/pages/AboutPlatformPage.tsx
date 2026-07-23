import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'
import { HeroHeader } from '@/components/onboardingShared'
import { Slider, SlotoMark } from '@/pages/WelcomePage'

// Экран «О платформе» (макет 10358-42824) — открывается из «Другое».
// Логотип + подзаголовок, слайдер-карусель фич (как на онбординге), список
// возможностей и юр-реквизиты. Кнопки нет — только просмотр, назад по стрелке.
const BENEFITS = [
  'Кабинет для управления бизнесом',
  'Личный AI-ассистент',
  'Помощник для твоих клиентов',
]

export default function AboutPlatformPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="О платформе" onBack={() => navigate(-1)} />

      {/* Контент: Figma top 200 (тулбар 164 + ~36) → paddingTop 36; gap 24 между блоками. */}
      <div style={{ padding: '36px 16px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {/* Логотип + подзаголовок (gap 16) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
          <div style={{ color: 'var(--color-on-surface)' }}><SlotoMark /></div>
          <div style={{ ...text.caption1, color: 'var(--color-interactive-element-secondary)', textAlign: 'center', width: '100%', whiteSpace: 'pre-line' }}>
            {'Это платформа для записи клиентов\nи управления частной практикой'}
          </div>
        </div>

        {/* Слайдер фич (тот же, что на онбординге) */}
        <Slider />

        {/* Список возможностей (gap 20, pb 32) + слоган */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingBottom: 32, width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {BENEFITS.map((label) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                <CheckCircle28 />
                <span style={{ ...text.body1, color: 'var(--color-on-surface)', flex: 1, minWidth: 0 }}>{label}</span>
              </div>
            ))}
          </div>
          <span style={{ ...text.caption1, color: 'var(--color-interactive-element-secondary)', textAlign: 'center', width: '100%' }}>
            Управляй бизнесом грамотно!
          </span>
        </div>

        {/* Юр-реквизиты (Figma «Label 2» 12/14/600, не капс, ls 0.06) */}
        <div style={{ ...text.label2Caps, textTransform: 'none', letterSpacing: 0.06, color: 'var(--color-interactive-element-secondary)', textAlign: 'center', width: '100%' }}>
          <div>ООО «Система», 2026 год</div>
          <div>ИНН 9706002253, ОГРН 1197746529640</div>
        </div>
      </div>
    </div>
  )
}

// Галка-пункт 28: синий круг + белая галка (как в списке подписки).
function CheckCircle28() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="14" cy="14" r="13" fill="var(--color-primary-surface)" />
      <path d="M8.5 14.3L12.2 18L19.5 10.5" stroke="var(--color-on-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
