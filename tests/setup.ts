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

afterEach(() => {
  for (const cookieName of Object.keys(Cookies.get())) {
    Cookies.remove(cookieName, { path: '/' })
  }

  localStorage.clear()
})
