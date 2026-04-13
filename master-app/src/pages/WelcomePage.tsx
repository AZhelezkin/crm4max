import { useNavigate } from 'react-router-dom'
import slotoLogoUrl from '@/assets/sloto-logo.svg'
import slotoHeaderUrl from '@/assets/sloto-welcome-header.svg'
import slotoFeaturesUrl from '@/assets/sloto-welcome-features.svg'

export default function WelcomePage() {
  const navigate = useNavigate()

  const handleJoin = () => {
    navigate('/onboarding', { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0F0F11',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
      }}
    >
      {/* ── Заголовок (path-картинка из макета: шрифт и межстрочные точные) ── */}
      <div
        style={{
          paddingTop: 'calc(56px + env(safe-area-inset-top))',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <img
          src={slotoHeaderUrl}
          alt="Добро пожаловать в самую простую платформу ведения бизнеса"
          style={{ display: 'block', width: 260, height: 'auto' }}
        />
      </div>

      {/* ── Логотип sloto (blur-пузыри + буквы + акценты — как единая картинка) ── */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        <img
          src={slotoLogoUrl}
          alt="sloto"
          style={{
            display: 'block',
            width: '100%',
            maxWidth: 360,
            height: 'auto',
          }}
        />
      </div>

      {/* ── Список фич (path-картинка, шрифт и интервалы из макета) ── */}
      <div
        style={{
          padding: '0 24px 40px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <img
          src={slotoFeaturesUrl}
          alt="Каталог ваших услуг, календарь записей, оплата услуг, автоматическая уплата налогов, напоминания"
          style={{ display: 'block', width: 300, height: 'auto' }}
        />
      </div>

      {/* ── Кнопка «Присоединиться» ── */}
      {/* SVG: rect x=14 y=803 w=392 h=60 rx=20 fill=#007AFE; text cap ≈ 17 → fontSize 20 */}
      <div
        style={{
          padding: '0 14px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        <button
          type="button"
          onClick={handleJoin}
          style={{
            width: '100%',
            height: 60,
            borderRadius: 20,
            border: 'none',
            background: '#007AFE',
            color: '#fff',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: -0.3,
            cursor: 'pointer',
          }}
        >
          Присоединиться
        </button>
      </div>
    </div>
  )
}
