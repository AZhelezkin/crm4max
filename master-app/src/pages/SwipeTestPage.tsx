import { useEffect, useRef, useState } from 'react'
import { keepVerticalSwipesDisabled, setVerticalSwipes, verticalSwipesInfo } from '@/lib/bridge'
import { text } from '@/styles/typography'

/**
 * Прототип для проверки блокировки нативного «свайп вниз = закрыть приложение».
 * Открывается по https://azhelezkin.github.io/crm4max/#/swipe-test
 * (без проверки start_param, как MapTestPage) — можно зайти из любого бота.
 *
 * Как тестировать:
 *  1) «Разрешить свайпы» → пролистать наверх → потянуть вниз — приложение должно
 *     свернуться/закрыться (это текущее поведение, которое мешает);
 *  2) снова открыть, «Заблокировать свайпы» → повторить жест — приложение должно
 *     остаться на месте.
 * Внизу — длинный контент, чтобы жест проверялся и в скролле, и в самом верху.
 */
export default function SwipeTestPage() {
  const info = verticalSwipesInfo()
  const [enabled, setEnabled] = useState<boolean | undefined>(info.enabled)
  const [log, setLog] = useState<string[]>([])
  const seq = useRef(0)

  const addLog = (line: string) => {
    seq.current += 1
    setLog((prev) => [`${seq.current}. ${line}`, ...prev].slice(0, 12))
  }

  // На старте страница ничего не меняет — состояние ставит сам пользователь кнопками,
  // иначе первый пункт сценария (проверить «как было») не воспроизвести.
  useEffect(() => {
    addLog(
      `окружение: WebApp=${info.hasWebApp ? 'есть' : 'нет'}, ` +
      `метод=${info.hasMethod ? 'есть' : 'нет'}, ` +
      `isVerticalSwipesEnabled=${String(info.enabled)}`,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apply = async (allow: boolean) => {
    const res = await setVerticalSwipes(allow)
    if (res.ok) {
      setEnabled(res.allowVerticalSwipes)
      addLog(`${allow ? 'enableVerticalSwipes' : 'disableVerticalSwipes'} → allowVerticalSwipes=${res.allowVerticalSwipes}`)
    } else {
      addLog(`${allow ? 'enable' : 'disable'} — ошибка: ${res.error}`)
    }
  }

  // Проверка «боевого» варианта: ровно то, что вызывает App на старте приложения.
  const applyAppDefault = () => {
    const stop = keepVerticalSwipesDisabled()
    addLog('keepVerticalSwipesDisabled() — как в App на старте')
    // Сразу отписываемся от visibilitychange: на тест-странице слушатель не нужен.
    setTimeout(stop, 0)
  }

  const statusLabel =
    enabled === undefined ? 'неизвестно (клиент не сообщил)'
    : enabled ? 'РАЗРЕШЕНЫ — свайп вниз закрывает приложение'
    : 'ЗАБЛОКИРОВАНЫ — свайп вниз не закрывает'

  const btn = (bg: string, fg: string): React.CSSProperties => ({
    ...text.bodyStrong, background: bg, color: fg, border: 'none', borderRadius: 14,
    padding: '14px 16px', cursor: 'pointer', width: '100%',
  })

  return (
    <div style={{ minHeight: '100dvh', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* history.back(), а не useNavigate: страница может рендериться до Router
            (вход по ?startapp=swipetest / #/swipe-test), там хуков роутера нет. */}
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Назад"
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: 'var(--color-surface)', color: 'var(--color-on-surface)',
            cursor: 'pointer', ...text.bodyStrong,
          }}
        >
          ←
        </button>
        <div style={{ ...text.title, color: 'var(--color-on-surface)' }}>Тест свайпов</div>
      </div>

      <div style={{
        background: 'var(--color-surface)', borderRadius: 16, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Состояние жеста</div>
        <div style={{
          ...text.bodyStrong,
          color: enabled === false ? 'var(--color-success-surface-accented)' : 'var(--color-error-surface-accented)',
        }}>
          {statusLabel}
        </div>
        <div style={{ ...text.footnote, color: 'var(--color-on-surface-secondary)' }}>
          window.WebApp: {info.hasWebApp ? 'есть' : 'нет'} · disableVerticalSwipes: {info.hasMethod ? 'есть' : 'нет'}
        </div>
      </div>

      <button type="button" onClick={() => void apply(false)} style={btn('var(--color-primary-surface)', 'var(--color-on-primary-surface)')}>
        Заблокировать свайпы
      </button>
      <button type="button" onClick={() => void apply(true)} style={btn('var(--color-secondary-surface)', 'var(--color-on-surface)')}>
        Разрешить свайпы (как было)
      </button>
      <button type="button" onClick={applyAppDefault} style={btn('var(--color-secondary-surface)', 'var(--color-on-surface)')}>
        Применить как в App (keepVerticalSwipesDisabled)
      </button>

      <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Лог</div>
        {log.map((line) => (
          <div key={line} style={{ ...text.footnote, color: 'var(--color-on-surface)', wordBreak: 'break-word' }}>{line}</div>
        ))}
      </div>

      <div style={{ ...text.footnote, color: 'var(--color-on-surface-secondary)' }}>
        Пролистайте вниз и обратно наверх, затем потяните экран вниз — при блокировке
        приложение должно остаться открытым.
      </div>

      {/* Длинный контент — чтобы жест проверялся и в скролле, и в самом верху страницы. */}
      {Array.from({ length: 30 }, (_, i) => (
        <div key={i} style={{
          background: 'var(--color-surface)', borderRadius: 12, padding: 16,
          ...text.body, color: 'var(--color-on-surface-secondary)',
        }}>
          Блок прокрутки #{i + 1}
        </div>
      ))}
    </div>
  )
}
