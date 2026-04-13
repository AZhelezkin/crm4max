import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

type RecState = 'idle' | 'recording' | 'recorded' | 'playing'

export default function AudioTestPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<RecState>('idle')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const addLog = (msg: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} ${msg}`])
  }

  const startRecording = async () => {
    setError(null)
    setAudioUrl(null)
    chunks.current = []
    setDuration(0)

    try {
      addLog('Запрашиваем getUserMedia...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      addLog(`Получен stream, tracks: ${stream.getAudioTracks().length}`)

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        '',
      ]
      let selectedMime = ''
      for (const mime of mimeTypes) {
        if (!mime || MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime
          addLog(`MIME: ${mime || '(default)'}`)
          break
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined)
      mediaRecorder.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data)
          addLog(`Chunk: ${e.data.size} bytes`)
        }
      }

      recorder.onstop = () => {
        addLog(`Запись остановлена, chunks: ${chunks.current.length}`)
        const blob = new Blob(chunks.current, { type: selectedMime || 'audio/webm' })
        addLog(`Blob size: ${blob.size} bytes`)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState('recorded')

        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.onerror = (e) => {
        addLog(`Ошибка recorder: ${(e as any).error?.message || 'unknown'}`)
        setError(`MediaRecorder error: ${(e as any).error?.message || 'unknown'}`)
      }

      recorder.start(1000) // chunk every 1s
      addLog(`Recorder started, state: ${recorder.state}`)
      setState('recording')

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch (err: any) {
      const msg = err?.message || String(err)
      addLog(`Ошибка: ${msg}`)
      setError(msg)
    }
  }

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
      addLog('Останавливаем запись...')
    }
  }

  const playAudio = () => {
    if (!audioUrl) return
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    setState('playing')
    audio.onended = () => setState('recorded')
    audio.onerror = () => {
      addLog('Ошибка воспроизведения')
      setState('recorded')
    }
    audio.play()
    addLog('Воспроизведение...')
  }

  const stopPlaying = () => {
    audioRef.current?.pause()
    setState('recorded')
  }

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setDuration(0)
    setState('idle')
    setError(null)
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 4px 0', flexShrink: 0 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }}>
          Аудио тест
        </div>
        <div style={{ width: 56 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 }}>

        {/* Timer circle */}
        <div style={{
          width: 160, height: 160, borderRadius: '50%',
          background: state === 'recording' ? 'rgba(206,66,89,0.15)' : 'var(--color-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: state === 'recording' ? '3px solid #CE4259' : '3px solid var(--color-border)',
          transition: 'all 0.3s',
        }}>
          <span style={{
            fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: state === 'recording' ? '#CE4259' : 'var(--color-text)',
          }}>
            {formatTime(duration)}
          </span>
        </div>

        {/* Main action button */}
        {state === 'idle' && (
          <button
            onClick={startRecording}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#CE4259', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(206,66,89,0.4)',
            }}
          >
            {/* Mic icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="white" />
              <path d="M5 10a7 7 0 0 0 14 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 19v3M9 22h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {state === 'recording' && (
          <button
            onClick={stopRecording}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#CE4259', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(206,66,89,0.4)',
              animation: 'pulse 1.5s infinite',
            }}
          >
            {/* Stop icon */}
            <div style={{ width: 24, height: 24, borderRadius: 4, background: 'white' }} />
          </button>
        )}

        {state === 'recorded' && (
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={playAudio}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--color-primary)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {/* Play icon */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <polygon points="6,3 20,12 6,21" />
              </svg>
            </button>
            <button
              onClick={reset}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--color-card)', border: '2px solid var(--color-border)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {/* Reset icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M1 4v6h6M23 20v-6h-6" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        {state === 'playing' && (
          <button
            onClick={stopPlaying}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--color-primary)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Pause icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>
        )}

        {/* Label */}
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, textAlign: 'center' }}>
          {state === 'idle' && 'Нажмите для записи'}
          {state === 'recording' && 'Идёт запись...'}
          {state === 'recorded' && 'Запись готова'}
          {state === 'playing' && 'Воспроизведение...'}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(206,66,89,0.15)', border: '1px solid #CE4259',
            borderRadius: 12, padding: '12px 16px', width: '100%', maxWidth: 360,
          }}>
            <div style={{ color: '#CE4259', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Ошибка</div>
            <div style={{ color: '#CE4259', fontSize: 13, wordBreak: 'break-word' }}>{error}</div>
          </div>
        )}
      </div>

      {/* Debug log */}
      <div style={{
        background: 'var(--color-card)', borderTop: '1px solid var(--color-border)',
        padding: '12px 16px', maxHeight: 180, overflowY: 'auto',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          Debug Log
        </div>
        {log.length === 0
          ? <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Лог пуст</div>
          : log.map((l, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.6, fontFamily: 'monospace' }}>
                {l}
              </div>
            ))
        }
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(206,66,89,0.5); }
          70% { box-shadow: 0 0 0 20px rgba(206,66,89,0); }
          100% { box-shadow: 0 0 0 0 rgba(206,66,89,0); }
        }
      `}</style>
    </div>
  )
}
