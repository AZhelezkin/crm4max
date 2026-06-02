---
name: run-master-app-screen
description: Запустить и посмотреть отдельный экран/компонент master-app (Max mini-app) вживую в браузере. Использовать, когда нужно «запустить», открыть, снять скриншот экрана master-app или убедиться, что вёрстка/изменение работает в реальном приложении (а не только в тестах). Полный флоу приложения headless не поднимается (нужен рантайм Max + бэкенд), поэтому экран рендерится изолированно через временный Vite-harness + headless Chrome.
---

# Запуск отдельного экрана master-app

## Почему не «просто открыть приложение»

`master-app` — это Max mini-app. В обычном браузере оно **не бутстрапится до большинства экранов**:
`src/lib/bridge.ts` бросает `MAX WebApp unavailable`, если нет `window.WebApp` (рантайм Max), а
дальше нужен бэкенд (`/api`, прокси на `localhost:3000`) и Max Silent Auth → JWT. Dev-мока нет.

Поэтому «запуск» отдельного экрана = отрендерить **настоящий компонент** в реальной Vite-сборке через
временный harness и снять скриншот системным Chrome. Компоненты-порталы (`*Portal.tsx`,
`AvatarCropPortal` и т.п.) самодостаточны — принимают пропсы, не лезут в bridge.

Если экран реально зависит от bridge/бэкенда — замокай `window.WebApp` в harness или передай данные пропсами.

## Рецепт (проверен)

### 1. Временный harness

`master-app/screen-harness.html` (в корне master-app — Vite отдаёт любой .html):

```html
<!doctype html>
<html lang="ru">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>harness</title>
    <style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#root{height:100%}</style>
  </head>
  <body><div id="root"></div><script type="module" src="/src/screen-harness.tsx"></script></body>
</html>
```

`master-app/src/screen-harness.tsx` — монтирует целевой компонент. ВАЖНО: импортировать `@/index.css`
(CSS-переменные темы; `:root` = Dark по умолчанию), иначе `var(--color-*)` не разрешатся.

```tsx
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import TargetComponent from '@/components/TargetComponent'
import '@/index.css'

function Harness() {
  const [open, setOpen] = useState(true)
  // ...подставь нужные пропсы / тест-данные...
  return <TargetComponent open={open} onClose={() => setOpen(false)} />
}
createRoot(document.getElementById('root')!).render(<Harness />)
```

Для автоматического действия (клик по кнопке для скриншота «после») — ветка по `?auto=1`:

```tsx
useEffect(() => {
  if (new URLSearchParams(location.search).get('auto') !== '1') return
  const t = setTimeout(() => {
    [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Сохранить')?.click()
  }, 700)
  return () => clearTimeout(t)
}, [])
```

### 2. Поднять Vite (фоном) и дождаться готовности

```bash
# Bash, run_in_background: true
cd master-app && npx vite --port 5199 --strictPort --host 127.0.0.1
```
```bash
# поллинг (НЕ sleep-first)
for i in $(seq 1 40); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5199/screen-harness.html)" = "200" ] && break
  sleep 0.5
done
```

### 3. Скриншот системным Chrome (headless)

PowerShell. Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`
(запасной — Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).

```powershell
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$prof = Join-Path $env:TEMP "chrome-shot-profile"   # отдельный профиль — иначе пустой файл из-за лока
$out  = "D:\Projects\crm4max\_shot.png"
& $chrome "--headless=new" "--disable-gpu" "--no-sandbox" "--hide-scrollbars" "--user-data-dir=$prof" `
  "--window-size=390,844" "--force-device-scale-factor=2" "--screenshot=$out" `
  "--virtual-time-budget=2500" "http://127.0.0.1:5199/screen-harness.html"
if (Test-Path $out) { (Get-Item $out).Length } else { "NO FILE" }
```

- `--window-size=390,844` ≈ телефон-портрет; `--force-device-scale-factor=2` — чёткий PNG.
- `--virtual-time-budget=<мс>` даёт отработать таймерам/`onload`/rAF до кадра. Для `?auto=1` (клик на 700мс) ставь ≥3500.
- **Обязательно `--user-data-dir`** на отдельный профиль: без него повторный/параллельный запуск молча не пишет файл.

### 4. Посмотреть и прибрать

- Открыть PNG инструментом **Read** и реально посмотреть (пустой кадр = не запустилось).
- `TaskStop` фонового Vite по его task_id.
- Удалить временные файлы: `rm -f master-app/screen-harness.html master-app/src/screen-harness.tsx _shot*.png`.

## Подводные камни

- **Не запускать голый `tsc`** для проверки типов: build-скрипт `tsc && vite build`, и `tsc` без флагов
  **эмитит** `.js` рядом с `.tsx` в `src/` (отсюда не-tracked legacy-`.js`). Типы проверять `npx tsc --noEmit`.
- Алиасы Vite: `@` → `src`, `@client` → `src/client` (`vite.config.ts`); `.tsx` приоритетнее `.js`.
- Тесты: `npx vitest run` (компонентные, ~16 тестов в Card/Button/Input).
- Источник истины по вёрстке — `design/*.svg` (см. CLAUDE.md); токены цвета/типографики — `src/styles`.
