import axios from 'axios'
import { getLaunchContext } from '@/lib/launchContext'

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Подставляем JWT из localStorage в каждый запрос
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(getLaunchContext().tokenKey)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Глобальная обработка 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const context = getLaunchContext()
      localStorage.removeItem(context.tokenKey)
      if (context.provider === 'max') window.location.hash = '#/onboarding'
    }
    return Promise.reject(err)
  }
)
