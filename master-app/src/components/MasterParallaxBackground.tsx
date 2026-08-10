import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function MasterParallaxBackground() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/welcome')) return

    const root = document.documentElement
    document.body.classList.add('master-parallax')
    let frame = 0
    let resetTimer = 0
    let lastY = window.scrollY

    const update = () => {
      const speed = Math.min(1, Math.abs(window.scrollY - lastY) / 28)
      lastY = window.scrollY
      root.style.setProperty('--master-parallax-y', `${window.scrollY * 0.12}px`)
      root.style.setProperty('--master-parallax-scale', String(1 + speed * 0.012))
      root.style.setProperty('--master-parallax-saturation', String(1 + speed * 0.04))
      resetTimer = window.setTimeout(() => {
        root.style.setProperty('--master-parallax-scale', '1')
        root.style.setProperty('--master-parallax-saturation', '1')
      }, 80)
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(resetTimer)
      frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      window.clearTimeout(resetTimer)
      document.body.classList.remove('master-parallax')
      root.style.removeProperty('--master-parallax-y')
      root.style.removeProperty('--master-parallax-scale')
      root.style.removeProperty('--master-parallax-saturation')
    }
  }, [location.pathname])

  return null
}
