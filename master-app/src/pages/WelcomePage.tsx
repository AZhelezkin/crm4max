import { useNavigate } from 'react-router-dom'

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

      {/* ── Логотип sloto с blur-пузырями ── */}
      {/* SVG: 4 ellipse r≈34.8, blur stdDev=50, центр (210, 405); red dot #FF6783 r=7.19 @ (297, 401.563); ring r=22.5 @ (297, 424.989) */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        <svg
          width="320"
          height="220"
          viewBox="60 280 300 250"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', maxWidth: '100%' }}
        >
          <defs>
            <filter
              id="welcomeBlur"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="50" />
            </filter>
            <linearGradient
              id="welcomePurpleTop"
              x1="245.22"
              y1="340.021"
              x2="175.698"
              y2="380.48"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#844BB6" />
              <stop offset="1" stopColor="#5F68E2" />
            </linearGradient>
            <linearGradient
              id="welcomePurpleBottom"
              x1="245.22"
              y1="423.417"
              x2="175.698"
              y2="463.877"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#844BB6" />
              <stop offset="1" stopColor="#5F68E2" />
            </linearGradient>
            <linearGradient
              id="welcomeRingStroke"
              x1="297.031"
              y1="415.429"
              x2="320.043"
              y2="447.934"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" />
              <stop offset="1" stopColor="#152149" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Блюр-пузыри (центр 210, 405) */}
          <g filter="url(#welcomeBlur)">
            <ellipse cx="258.28" cy="405.5" rx="34.8" ry="34.72" fill="#007AFE" />
            <ellipse
              cx="210.5"
              cy="363.802"
              rx="34.72"
              ry="34.8"
              fill="url(#welcomePurpleTop)"
            />
            <ellipse cx="162.72" cy="405.5" rx="34.8" ry="34.72" fill="#007AFE" />
            <ellipse
              cx="210.5"
              cy="447.198"
              rx="34.72"
              ry="34.8"
              fill="url(#welcomePurpleBottom)"
            />
          </g>

          {/* Декоративное кольцо (под точкой, чуть ниже базовой линии) */}
          <circle
            cx="297"
            cy="424.989"
            r="22.5"
            fill="#F0F3FF"
            fillOpacity="0.1"
            stroke="url(#welcomeRingStroke)"
          />

          {/* Красная точка-акцент */}
          <circle cx="297.123" cy="401.563" r="7.19" fill="#FF6783" />

          {/* Название бренда: s·l·o·t·o */}
          <text
            x="210.5"
            y="420"
            textAnchor="middle"
            fontSize="34"
            fontWeight="700"
            fill="#fff"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            letterSpacing="2"
          >
            s·l·o·t·o
          </text>
        </svg>
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
