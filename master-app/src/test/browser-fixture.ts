import { vi } from 'vitest'

interface BrowserFixtureOptions {
  lightTheme?: boolean
  clipboard?: boolean
  share?: boolean
  visualViewport?: boolean
  canvas?: boolean
}

const originalDescriptors = {
  matchMedia: Object.getOwnPropertyDescriptor(window, 'matchMedia'),
  visualViewport: Object.getOwnPropertyDescriptor(window, 'visualViewport'),
  clipboard: Object.getOwnPropertyDescriptor(navigator, 'clipboard'),
  share: Object.getOwnPropertyDescriptor(navigator, 'share'),
  createObjectURL: Object.getOwnPropertyDescriptor(URL, 'createObjectURL'),
  revokeObjectURL: Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL'),
}

function restoreProperty(target: object, key: PropertyKey, descriptor?: PropertyDescriptor) {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor)
    return
  }
  Reflect.deleteProperty(target, key)
}

export function installBrowserFixture(options: BrowserFixtureOptions = {}) {
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()
  const share = vi.fn<(data?: ShareData) => Promise<void>>().mockResolvedValue()
  const addMediaListener = vi.fn()
  const removeMediaListener = vi.fn()
  const addViewportListener = vi.fn()
  const removeViewportListener = vi.fn()
  const createObjectURL = vi.fn<(value: Blob | MediaSource) => string>().mockReturnValue('blob:test-image')
  const revokeObjectURL = vi.fn<(url: string) => void>()
  const drawImage = vi.fn()
  const canvasContext: CanvasRenderingContext2D = Object.create(null)
  canvasContext.drawImage = drawImage

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn<(query: string) => MediaQueryList>().mockImplementation((query) => ({
      matches: options.lightTheme ?? false,
      media: query,
      onchange: null,
      addEventListener: addMediaListener,
      removeEventListener: removeMediaListener,
      addListener: addMediaListener,
      removeListener: removeMediaListener,
      dispatchEvent: vi.fn().mockReturnValue(true),
    })),
  })

  if (options.clipboard !== false) {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
  }

  if (options.share !== false) {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    })
  }

  if (options.visualViewport !== false) {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        width: 390,
        height: 844,
        scale: 1,
        offsetLeft: 0,
        offsetTop: 0,
        pageLeft: 0,
        pageTop: 0,
        onresize: null,
        onscroll: null,
        addEventListener: addViewportListener,
        removeEventListener: removeViewportListener,
        dispatchEvent: vi.fn().mockReturnValue(true),
      } satisfies VisualViewport,
    })
  }

  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })

  if (options.canvas !== false) {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,dGVzdA==')
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['test-image'], { type: 'image/jpeg' }))
    })
  }

  return {
    open,
    writeText,
    share,
    addMediaListener,
    removeMediaListener,
    addViewportListener,
    removeViewportListener,
    createObjectURL,
    revokeObjectURL,
    drawImage,
  }
}

export function resetBrowserFixture() {
  restoreProperty(window, 'matchMedia', originalDescriptors.matchMedia)
  restoreProperty(window, 'visualViewport', originalDescriptors.visualViewport)
  restoreProperty(navigator, 'clipboard', originalDescriptors.clipboard)
  restoreProperty(navigator, 'share', originalDescriptors.share)
  restoreProperty(URL, 'createObjectURL', originalDescriptors.createObjectURL)
  restoreProperty(URL, 'revokeObjectURL', originalDescriptors.revokeObjectURL)
}
