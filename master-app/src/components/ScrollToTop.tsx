import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Сброс прокрутки окна наверх при смене роута. React Router v6 (Hash/BrowserRouter,
// не data-роутер) позицию прокрутки не восстанавливает, из-за чего длинные страницы
// открывались «промотанными» — верхние кнопки/шапка уезжали за вьюпорт.
// useLayoutEffect (а не useEffect) — чтобы сброс произошёл до пейнта, без мелькания
// старой позиции. Монтируется внутри роутера, ничего не рендерит.
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
