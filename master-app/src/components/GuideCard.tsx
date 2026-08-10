import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'
import { useAuthStore } from '@/store/auth.store'
import { markGuideStep } from '@/lib/guide'
import helloImg from '@/assets/guide-hello.png'
import confettiImg from '@/assets/guide-confetti.png'

/**
 * Гид «Добро пожаловать!» на главной мастера (макет 10053-50054): чек-лист
 * погружения в функционал. Шаг «познакомиться с ботом» выполнен всегда
 * (регистрация идёт через мастер-бот) — поэтому «осталось всего 3 шага».
 * Остальные отмечаются реальными действиями (см. lib/guide). Когда все три
 * выполнены — состояние «Отлично!» (макет 10065-50531). Крестик скрывает
 * карточку навсегда (dismissed на бэке).
 */
export default function GuideCard({ firstBookingId }: { firstBookingId?: string }) {
  const navigate = useNavigate()
  const master = useAuthStore((s) => s.master)
  const progress = master?.guideProgress ?? {}
  if (progress.dismissed) return null

  const remainingSteps = [progress.edited, progress.shared, progress.openedBooking].filter(Boolean).length
  const allDone = !!progress.edited && !!progress.shared && !!progress.openedBooking

  const dismiss = () => {
    markGuideStep('dismissed')
  }

  return (
    <div style={{
      width: '100%', boxSizing: 'border-box', background: 'var(--color-surface-transparent)',
      borderRadius: 24, cornerShape: 'squircle', padding: 12, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Заголовок: картинка 41×38 + тексты + крестик */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <img src={allDone ? confettiImg : helloImg} alt="" width={32} height={30} style={{ width: 32, height: 30, objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
          <span style={{ ...text.callout1, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {allDone ? 'Отлично!' : 'Добро пожаловать!'}
          </span>
          <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'pre-line' }}>
            {allDone
              ? 'Кабинет готов к работе.\nУдачных записей!'
              : `Мы уже подготовили пример кабинета. Осталось всего ${3 - remainingSteps} ${3 - remainingSteps === 1 ? 'шаг' : 'шага'}, чтобы начать работу`}
          </span>
        </div>
        <button
          type="button"
          aria-label="Скрыть подсказки"
          onClick={dismiss}
          style={{ padding: 0, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', color: 'var(--color-interactive-element-secondary)' }}
        >
          <CloseCircleIcon />
        </button>
      </div>

      {/* Задачи (в «Отлично!»-состоянии списка нет) */}
      {!allDone && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* 1. Бот — выполнен всегда (регистрация через мастер-бот). */}
          <GuideTask done>
            Познакомиться с умным<br />ассистентом — ботом в чате
          </GuideTask>
          {/* 2. Заменить пример своими данными (любое сохранение правки). */}
          <GuideTask done={!!progress.edited}>
            Нажми на <InlineEditIcon done={!!progress.edited} /> возле любого<br />блока, чтобы заменить пример<br />своими данными
          </GuideTask>
          {/* 3. Поделиться профилем (экран /share). */}
          <GuideTask done={!!progress.shared}>
            Поделись профилем кнопкой<br />сверху справа <InlineExportIcon done={!!progress.shared} /> так клиенты<br />смогут записаться
          </GuideTask>
          {/* 4. Открыть запись — кликабельная, ведёт в пример-запись. */}
          <GuideTask
            done={!!progress.openedBooking}
            onClick={firstBookingId ? () => navigate(`/bookings/${firstBookingId}`) : undefined}
          >
            Попробуй открыть запись Синьёры<br />Капибары и посмотри, как<br />работают записи
          </GuideTask>
        </div>
      )}
    </div>
  )
}

// Строка-задача: surface rx8, чекбокс 28 + текст 15/20.
// Выполненная — галка, зачёркнутый приглушённый текст (макет 10053-50054).
function GuideTask({ done, onClick, children }: {
  done: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      style={{
        width: '100%', boxSizing: 'border-box', background: 'var(--color-surface)',
        borderRadius: 8, padding: '16px 20px 16px 16px', border: 'none', textAlign: 'left',
        boxShadow: '0px 1px 1px rgba(0,0,0,0.1)', cursor: onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: 16,
      }}
    >
      <GuideCheck done={done} />
      <span style={{
        ...text.caption1, color: 'var(--color-on-surface)', flex: 1, minWidth: 0,
        ...(done ? { textDecoration: 'line-through', opacity: 0.5 } : {}),
      }}>
        {children}
      </span>
    </Tag>
  )
}

// Чекбокс 28: синий круг с галкой / серый контурный круг (как Radio44, но 28).
function GuideCheck({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="14" cy="14" r="10.8" fill="var(--color-interactive-element)" />
        <path d="M9.6 14.2L12.6 17.2L18.4 11.2" stroke="var(--color-on-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="14" cy="14" r="10" stroke="var(--color-interactive-element)" strokeWidth="1.5" />
    </svg>
  )
}

// Инлайн-иконки в тексте задач (20×20, по базовой линии текста).
function InlineEditIcon({ done }: { done: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: -4, color: 'var(--color-primary-surface)' }}>
      <path d="M13.26 3.6 5.05 12.29c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.41 1.39-.75l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.34-5.29.16Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.89 5.05a6.126 6.126 0 0 0 5.45 5.15" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      {done && <path d="M0 14h24" stroke="var(--color-on-surface)" strokeWidth="2" />}
    </svg>
  )
}

function InlineExportIcon({ done }: { done: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: -4, color: 'var(--color-on-surface)' }}>
      <path d="M9 6.5 12 3.5 15 6.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12c0 4.42 3 8 8 8s8-3.58 8-8" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      {done && <path d="M0 14h24" stroke="var(--color-on-surface)" strokeWidth="2" />}
    </svg>
  )
}

// vuesax/linear/close-circle (24×24).
function CloseCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.17 14.83l5.66-5.66M14.83 14.83L9.17 9.17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
