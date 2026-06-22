import { text } from '@/styles/typography'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

// Экран «Настройки профиля» (Figma 8945:64458). Точка входа — шестерёнка на ProfilePage.
// Кликабельны только строки секции «Получение платежей»: Мои данные → /about (шаг 2),
// График работы → /schedule (шаг 3), Мои услуги → /services (каталог, шаг 4).
// «Оплата от клиентов» — предложение «Привязать карту» (свёрстано, некликабельно;
// сам функционал добавления карты добавится позднее). «Оплата подписки» — тоже верстка.

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh' }}>
      {/* Тулбар: круглый back 44 + центрированный заголовок (на hero-градиенте #root>div). */}
      <div style={{ position: 'relative', height: 56, display: 'flex', alignItems: 'center', padding: '6px 12px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Назад"
          style={{
            width: 44, height: 44, borderRadius: 22, flexShrink: 0, padding: 0,
            background: 'var(--color-background)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface)',
          }}
        >
          <ArrowLeftIcon />
        </button>
        <div style={{
          position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none',
          ...text.callout1, color: 'var(--color-on-surface)',
        }}>
          Настройки профиля
        </div>
      </div>

      {/* Контент: paddingTop16 (=16 под тулбаром), секции gap32, по бокам 16. */}
      <div style={{
        padding: '16px 16px calc(40px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 32,
      }}>
        {/* ── Получение платежей ── */}
        <Section label="Получение платежей">
          <SettingRow
            icon={<UserSquareIcon />}
            title="Мои данные"
            subtitle="Настроить"
            trailing={<ChevronRightIcon />}
            onClick={() => navigate('/about')}
          />
          <SettingRow
            icon={<CalendarIcon />}
            title="График работы"
            subtitle="Настроить"
            trailing={<ChevronRightIcon />}
            onClick={() => navigate('/schedule')}
          />
          <SettingRow
            icon={<FolderIcon />}
            title="Мои услуги"
            subtitle="Настроить"
            trailing={<ChevronRightIcon />}
            onClick={() => navigate('/services')}
          />
        </Section>

        {/* ── Оплата от клиентов: предложение привязать карту (Figma 8945:29664).
              Без иконки слева; функционал добавления карты — позднее, пока некликабельно. ── */}
        <Section label="Оплата от клиентов">
          <SettingRow
            title="Привязать карту"
            subtitle="Чтобы клиенты могли оплачивать на неё ваши услуги"
            trailing={<ChevronRightIcon />}
          />
        </Section>

        {/* ── Оплата подписки (некликабельно) ── */}
        <Section label="Оплата подписки">
          <SettingRow
            icon={<CardIcon />}
            title="Банковская карта"
            subtitle="** 0000"
            trailing={<EditIcon />}
          />
        </Section>

        {/* «Отменить подписку» — некликабельный приглушённый текст (Figma 8945:63705). */}
        <div style={{ ...text.caption2, color: 'var(--color-on-surface-muted)' }}>
          Отменить подписку
        </div>
      </div>
    </div>
  )
}

// Секция: лейбл (Body2 secondary) + список строк (gap8). Между лейблом и списком gap10.
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ ...text.body2, color: 'var(--color-on-surface-secondary)' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

// Строка-настройка: [иконка-чип 44] + (тайтл Callout1 + сабтайтл Caption2) + trailing.
// Кликабельна, если задан onClick (тогда <button>), иначе статичный <div>.
function SettingRow({ icon, title, subtitle, trailing, onClick }: {
  icon?: ReactNode
  title: string
  subtitle: string
  trailing: ReactNode
  onClick?: () => void
}) {
  const inner = (
    <>
      {icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-on-surface-secondary)',
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
          {subtitle}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{trailing}</div>
    </>
  )

  const style = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    background: 'var(--color-surface-transparent)', borderRadius: 20,
    padding: '16px 20px', textAlign: 'left' as const,
  }

  return onClick
    ? <button type="button" onClick={onClick} style={{ ...style, border: 'none', cursor: 'pointer' }}>{inner}</button>
    : <div style={style}>{inner}</div>
}

// ─── Иконки (vuesax/linear, 24×24, stroke=currentColor) ──────────────────────────

function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UserSquareIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9 2h6c5 0 7 2 7 7v6c0 5-2 7-7 7H9c-5 0-7-2-7-7V9c0-5 2-7 7-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 11.5a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.6 18.9c.3-1.93 2.6-3.4 5.4-3.4s5.1 1.47 5.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2v3M16 2v3" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.7 13.7h.01M11.99 13.7h.01M8.29 13.7h.01M15.7 16.7h.01M11.99 16.7h.01M8.29 16.7h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/folder
function FolderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M22 11v6c0 4-1 5-5 5H7c-4 0-5-1-5-5V8c0-4 1-5 5-5h1.5c1.5 0 1.83.44 2.4 1.2l1.5 2c.38.5.6.8 1.6.8h3c4 0 5 1 5 4Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/card
function CardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M2 9h20" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 16h3M11 16h4" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.44 3.5h11.11C21.11 3.5 22 4.39 22 7.92v8.16c0 3.53-.89 4.42-4.44 4.42H6.44C2.89 20.5 2 19.61 2 16.08V7.92C2 4.39 2.89 3.5 6.44 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/edit — карандаш (некликабельный, on-surface-secondary)
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M11 2H9C4 2 2 4 2 9v6c0 5 2 7 7 7h6c5 0 7-2 7-7v-2" stroke="var(--color-on-surface-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.04 3.02 8.16 10.9c-.3.3-.6.89-.66 1.32l-.43 3.01c-.16 1.09.61 1.85 1.7 1.7l3.01-.43c.42-.06 1.01-.36 1.32-.66l7.88-7.88c1.36-1.36 2-2.94 0-4.94-2-2-3.58-1.36-4.94 0Z" stroke="var(--color-on-surface-secondary)" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4L10.5 8L6 12" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
