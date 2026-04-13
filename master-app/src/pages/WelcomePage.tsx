import { useNavigate } from 'react-router-dom'
import slotoLogoUrl from '@/assets/sloto-logo.svg'

export default function WelcomePage() {
  const navigate = useNavigate()

  const handleJoin = () => {
    localStorage.setItem('welcomeSeen', '1')
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
      {/* ── Заголовок ── */}
      {/* SVG: 3 строки y=283,305,327; lineHeight = 305-283 = 22; cap ≈ 15 */}
      <div
        style={{
          paddingTop: 'calc(56px + env(safe-area-inset-top))',
          paddingLeft: 24,
          paddingRight: 24,
          textAlign: 'center',
          fontSize: 15,
          lineHeight: '22px',
          fontWeight: 400,
          color: '#fff',
        }}
      >
        Добро пожаловать в<br />
        самую простую платформу<br />
        ведения бизнеса
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

      {/* ── Список фич ── */}
      {/* SVG: 5 строк y=583,615,647,679,711; lineHeight = 32; первая белая, остальные 0.5 */}
      <div
        style={{
          padding: '0 24px 40px',
          textAlign: 'center',
          fontSize: 16,
          lineHeight: '32px',
          fontWeight: 500,
        }}
      >
        <div style={{ color: '#fff' }}>Каталог ваших услуг</div>
        <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Календарь записей</div>
        <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Оплата услуг</div>
        <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Автоматическая уплата налогов</div>
        <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Напоминания</div>
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
