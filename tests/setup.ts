import Cookies from 'js-cookie'
import { afterEach, vi } from 'vitest'

class ResizeObserver {
  disconnect () {}

  observe () {}

  unobserve () {}
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }),
})

vi.stubGlobal('ResizeObserver', ResizeObserver)
vi.stubGlobal('visualViewport', {
  addEventListener: vi.fn(),
  height: 768,
  offsetLeft: 0,
  offsetTop: 0,
  removeEventListener: vi.fn(),
  scale: 1,
  width: 1024,
})

afterEach(() => {
  for (const cookieName of Object.keys(Cookies.get())) {
    Cookies.remove(cookieName, { path: '/' })
  }

  localStorage.clear()
})
