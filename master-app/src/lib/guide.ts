import { mastersApi } from '@/api/masters.api'
import { useAuthStore } from '@/store/auth.store'

/**
 * Отметить шаг гида «Добро пожаловать!» (главная мастера, макеты 10053-50054 /
 * 10065-50531). Fire-and-forget из мест реальных действий: сохранение правки
 * («edited»), шеринг профиля («shared»), открытие записи («openedBooking»),
 * крестик карточки («dismissed»). Если шаг уже отмечен или гид скрыт — не шлём;
 * стор обновляется ответом бэка, чекбокс на главной отметится при возврате.
 */
export function markGuideStep(step: 'edited' | 'shared' | 'openedBooking' | 'dismissed'): void {
  // Трекинг никогда не должен ломать основное действие (сохранение/шеринг/…):
  // любые ошибки — в том числе синхронные — глотаем.
  try {
    const { master, setMaster } = useAuthStore.getState()
    if (!master) return
    const progress = master.guideProgress ?? {}
    if (progress[step] || (step !== 'dismissed' && progress.dismissed)) return
    mastersApi.markGuideStep(step)
      .then(({ guideProgress }) => {
        const current = useAuthStore.getState().master
        if (current && current.id === master.id) setMaster({ ...current, guideProgress })
      })
      .catch(() => { /* не критично — отметится при следующем действии */ })
  } catch { /* ignore */ }
}
