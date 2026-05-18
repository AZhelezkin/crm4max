import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function MainLayout() {
  // Не задаём `background` инлайном — он бы перекрыл глобальный hero-градиент,
  // зашитый в `#root > div` (см. index.css). Внутренние страницы (например,
  // ProfilePage) ожидают, что градиент с декоративными ::before-кругами виден
  // в верхних 390px экрана.
  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 60 }}>
      <Outlet />
      <BottomNav />
    </div>
  )
}
