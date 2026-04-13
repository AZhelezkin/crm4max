import { useEffect, useRef, useState } from 'react'
import {
  stepOneAddressInputIconStyle,
  stepOneAddressInputStyle,
  stepOneAddressInputWrapStyle,
} from '@/components/onboardingStepOne.styles'

const SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest'
const GEOCODE_URL = 'https://geocode-maps.yandex.ru/1.x/'
const STATIC_MAP_URL = 'https://static-maps.yandex.ru/1.x/'
const API_KEY = import.meta.env.VITE_YANDEX_SUGGEST_KEY as string
const GEOCODE_KEY = import.meta.env.VITE_YANDEX_GEOCODE_KEY as string
const JSMAPS_KEY = import.meta.env.VITE_YANDEX_JSMAPS_KEY as string | undefined
const DEFAULT_CENTER: [number, number] = [37.62007, 55.75363] // Москва, [lon, lat]
const DEFAULT_ZOOM = 16

interface Suggestion {
  title: string
  subtitle: string
}

// Прямое геокодирование: адрес → координаты (lon, lat)
async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const params = new URLSearchParams({
    geocode: address,
    format: 'json',
    results: '1',
    ...(GEOCODE_KEY ? { apikey: GEOCODE_KEY } : {}),
  })
  try {
    const res = await fetch(`${GEOCODE_URL}?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos
    if (typeof pos !== 'string') return null
    const [lon, lat] = pos.split(' ').map(Number)
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
    return [lon, lat]
  } catch {
    return null
  }
}

// Обратное геокодирование: координаты → адрес здания
async function reverseGeocode(lon: number, lat: number, signal?: AbortSignal): Promise<string | null> {
  const params = new URLSearchParams({
    geocode: `${lon},${lat}`,
    format: 'json',
    results: '1',
    kind: 'house',
    ...(GEOCODE_KEY ? { apikey: GEOCODE_KEY } : {}),
  })
  try {
    const res = await fetch(`${GEOCODE_URL}?${params}`, { signal })
    if (!res.ok) return null
    const data = await res.json()
    const geoObject = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
    if (!geoObject) return null
    // Берём «человеческий» адрес целиком: metaDataProperty.GeocoderMetaData.text
    const text: string | undefined = geoObject?.metaDataProperty?.GeocoderMetaData?.text
    return text ?? null
  } catch {
    return null
  }
}

// Ленивая загрузка Yandex Maps v3 SDK
let ymapsLoaderPromise: Promise<any> | null = null
function loadYmaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  const anyWin = window as any
  if (anyWin.ymaps3) return anyWin.ymaps3.ready.then(() => anyWin.ymaps3)
  if (ymapsLoaderPromise) return ymapsLoaderPromise
  if (!JSMAPS_KEY) return Promise.reject(new Error('VITE_YANDEX_JSMAPS_KEY is not set'))

  ymapsLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(JSMAPS_KEY)}&lang=ru_RU`
    script.async = true
    script.onload = () => {
      const ymaps3 = (window as any).ymaps3
      if (!ymaps3) { reject(new Error('ymaps3 not available after script load')); return }
      ymaps3.ready.then(() => resolve(ymaps3)).catch(reject)
    }
    script.onerror = () => reject(new Error('Failed to load Yandex Maps v3 SDK'))
    document.head.appendChild(script)
  })
  return ymapsLoaderPromise
}

interface Props {
  value: string
  onChange: (v: string) => void
  onGeocode?: (lat: number, lng: number) => void
  confirmedAddress?: string
}

export default function AddressSuggestInput({ value, onChange, onGeocode, confirmedAddress = '' }: Props) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestEnabled, setSuggestEnabled] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const ymapsRef = useRef<any>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reverseAbortRef = useRef<AbortController | null>(null)
  const skipNextActionEndRef = useRef(false)
  // Текущее значение, которое мы отдали наружу — нужно, чтобы на drag end обновить onChange, не ломая локальный ввод
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onGeocodeRef = useRef(onGeocode)
  onGeocodeRef.current = onGeocode

  // Синхронизация value → inputValue при смене снаружи
  useEffect(() => {
    setInputValue(value)
    setSuggestEnabled(false)
    setSuggestions([])
  }, [value])

  // Инициализация интерактивной карты
  useEffect(() => {
    if (!JSMAPS_KEY) { setMapFailed(true); return }
    let cancelled = false

    loadYmaps()
      .then(async (ymaps3) => {
        if (cancelled || !mapContainerRef.current) return
        ymapsRef.current = ymaps3

        // Стартовый центр: пытаемся геокодировать существующий адрес, иначе DEFAULT_CENTER
        let startCenter: [number, number] = DEFAULT_CENTER
        const initial = confirmedAddress?.trim() || value?.trim()
        if (initial) {
          const coords = await geocodeAddress(initial)
          if (coords) startCenter = coords
        }
        if (cancelled || !mapContainerRef.current) return

        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = ymaps3
        const map = new YMap(mapContainerRef.current, {
          location: { center: startCenter, zoom: DEFAULT_ZOOM },
          theme: 'dark',
        })
        map.addChild(new YMapDefaultSchemeLayer({}))
        map.addChild(new YMapDefaultFeaturesLayer({}))

        // Слушатель окончания перетаскивания
        const listener = new YMapListener({
          onActionEnd: () => {
            if (skipNextActionEndRef.current) {
              skipNextActionEndRef.current = false
              return
            }
            const loc = map.center as [number, number] | undefined
            if (!loc) return
            const [lon, lat] = loc
            // Отменяем предыдущий reverse
            if (reverseAbortRef.current) reverseAbortRef.current.abort()
            const ctrl = new AbortController()
            reverseAbortRef.current = ctrl
            reverseGeocode(lon, lat, ctrl.signal).then((text) => {
              if (ctrl.signal.aborted) return
              const nextValue = text ?? ''
              setInputValue(nextValue)
              setSuggestEnabled(false)
              setSuggestions([])
              onChangeRef.current(nextValue)
              onGeocodeRef.current?.(lat, lon)
            })
          },
        })
        map.addChild(listener)

        mapInstanceRef.current = map
        setMapReady(true)
      })
      .catch(() => {
        if (!cancelled) setMapFailed(true)
      })

    return () => {
      cancelled = true
      if (reverseAbortRef.current) reverseAbortRef.current.abort()
      try { mapInstanceRef.current?.destroy?.() } catch { /* ignore */ }
      mapInstanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Suggest
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const text = inputValue.trim()
    if (!text || !API_KEY || !suggestEnabled) { setSuggestions([]); return }

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          apikey: API_KEY, text, lang: 'ru', results: '5',
          types: 'house,street', print_address: '1',
        })
        const res = await fetch(`${SUGGEST_URL}?${params}`)
        if (!res.ok) return
        const data = await res.json()
        setSuggestions(
          (data.results ?? []).map((r: any) => ({
            title: r.title?.text ?? '',
            subtitle: r.subtitle?.text ?? '',
          }))
        )
      } catch { /* ignore */ }
    }, 300)
  }, [inputValue, suggestEnabled])

  // Пан карты к выбранному адресу
  const panMapTo = (lon: number, lat: number) => {
    const map = mapInstanceRef.current
    if (!map) return
    skipNextActionEndRef.current = true
    try {
      map.update({ location: { center: [lon, lat], zoom: DEFAULT_ZOOM, duration: 400 } })
    } catch {
      // Старые версии API могут не поддерживать duration
      try { map.setLocation({ center: [lon, lat], zoom: DEFAULT_ZOOM }) } catch { /* ignore */ }
    }
  }

  const handleSelect = (s: Suggestion) => {
    const full = s.subtitle ? `${s.title}, ${s.subtitle}` : s.title
    setInputValue(full)
    onChange(full)
    setSuggestEnabled(false)
    setSuggestions([])

    geocodeAddress(full).then((coords) => {
      if (!coords) return
      const [lon, lat] = coords
      panMapTo(lon, lat)
      onGeocode?.(lat, lon)
    })
  }

  // --- Фолбэк для dev/прод без JSMAPS_KEY: статическая карта как раньше ---
  const fallbackMapUrl = (() => {
    if (!mapFailed) return ''
    const [lon, lat] = DEFAULT_CENTER
    const params = new URLSearchParams({
      ll: `${lon},${lat}`, z: '15', l: 'map', lang: 'ru_RU', size: '450,450',
    })
    return `${STATIC_MAP_URL}?${params}`
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Интерактивная карта */}
      {!mapFailed && (
        <div
          ref={mapContainerRef}
          style={{ position: 'absolute', inset: 0, background: '#0F0F11' }}
        />
      )}
      {mapFailed && (
        <img
          src={fallbackMapUrl}
          alt="Карта"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Затемняющий градиент под UI */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(15,15,17,0.66) 0%, rgba(15,15,17,0.08) 28%, rgba(15,15,17,0.08) 62%, rgba(15,15,17,0.75) 100%)',
      }} />

      {/* Фиксированный центральный пин */}
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <CenterPin />
      </div>

      {/* Поле ввода */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px',
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, ...stepOneAddressInputWrapStyle, background: 'rgba(15,15,17,0.68)', backdropFilter: 'blur(6px)' }}>
          <div style={stepOneAddressInputIconStyle}><SearchIcon /></div>
          <input
            value={inputValue}
            onChange={(e) => {
              const next = e.target.value
              setInputValue(next)
              if (!next) {
                setSuggestEnabled(false)
                setSuggestions([])
              } else {
                setSuggestEnabled(true)
              }
              onChange(next)
            }}
            placeholder="Адрес"
            style={stepOneAddressInputStyle}
          />
        </div>
      </div>

      {/* Список подсказок */}
      {suggestions.length > 0 && (
        <div style={{ position: 'relative', zIndex: 3, overflowY: 'auto', minHeight: 0 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              onClick={() => handleSelect(s)}
              style={{
                width: '100%', background: 'rgba(15,15,17,0.82)', border: 'none',
                padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <LocationIcon />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: 'var(--color-text)', fontWeight: 500 }}>{s.title}</div>
                {s.subtitle && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{s.subtitle}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {inputValue.trim() && suggestEnabled && suggestions.length === 0 && (
        <div style={{
          position: 'relative', zIndex: 3,
          padding: '18px 16px', textAlign: 'center',
          color: 'var(--color-text-secondary)', fontSize: 14,
          background: 'rgba(15,15,17,0.82)',
        }}>
          Ничего не найдено
        </div>
      )}

      {/* Растягиваем зону клика на карту, занимая всё оставшееся место */}
      <div style={{ flex: 1, minHeight: 0 }} />

      {/* Экран инициализации */}
      {!mapReady && !mapFailed && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.55)', fontSize: 14,
          background: 'rgba(15,15,17,0.35)', pointerEvents: 'none',
        }}>
          Загружаем карту…
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" stroke="var(--color-text-secondary)" strokeWidth="1.8" />
      <path d="M20 20L16.65 16.65" stroke="var(--color-text-secondary)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="var(--color-text-secondary)" />
    </svg>
  )
}

function CenterPin() {
  return (
    <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17 1C8.71573 1 2 7.71573 2 16C2 26.25 17 43 17 43C17 43 32 26.25 32 16C32 7.71573 25.2843 1 17 1Z"
        fill="#007AFE" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round"
      />
      <circle cx="17" cy="16" r="5" fill="#FFFFFF" />
    </svg>
  )
}
