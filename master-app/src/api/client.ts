import axios from 'axios'

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Подставляем JWT из localStorage в каждый запрос
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('masterToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Глобальная обработка 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('masterToken')
      const base = import.meta.env.BASE_URL ?? '/'
      window.location.replace(`${base}#/onboarding`)
    }
    return Promise.reject(err)
  }
)
