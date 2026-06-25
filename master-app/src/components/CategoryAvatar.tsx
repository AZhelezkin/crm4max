// Аватар категории 44×44: фото категории, либо дефолт — фиолетовый кружок с белой
// иконкой папки (как у «Услуги без категории», макет 8717-50811 / 8905:49213).
// Раньше дефолтом были «ножницы» (✂️). Используется на главной мастера и в
// клиентском флоу (карточка мастера, выбор категории).
export default function CategoryAvatar({ photo }: { photo: string | null }) {
  if (photo) {
    return (
      <div style={{
        width: 44, height: 44, borderRadius: 22, flexShrink: 0,
        overflow: 'hidden', background: 'var(--color-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 22, flexShrink: 0,
      background: 'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* vuesax/linear/folder 20×20, белая */}
      <svg width="20" height="20" viewBox="46 214 24 24" fill="none">
        <path d="M68 225V231C68 235 67 236 63 236H53C49 236 48 235 48 231V221C48 217 49 216 53 216H54.5C56 216 56.33 216.44 56.9 217.2L58.4 219.2C58.78 219.7 59 220 60 220H63C67 220 68 221 68 225Z" stroke="#FFFFFF" strokeWidth="1.75" strokeMiterlimit="10" />
      </svg>
    </div>
  )
}
