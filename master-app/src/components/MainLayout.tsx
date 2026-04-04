import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function MainLayout() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}>
      <Outlet />
      <BottomNav />
    </div>
  )
}
