import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import WorkspaceViewport from '@/components/WorkspaceViewport.vue'
import { useUserPreferencesStore } from '@/stores/userPreferences'

interface Rectangle {
  bottom: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

function createPanelStub (className: string) {
  return defineComponent({
    name: `${className}-stub`,
    emits: ['close', 'toggle-fullscreen'],
    props: {
      isFullscreen: Boolean,
    },
    setup (props) {
      return () => h('section', {
        class: [className, 'workspace-sheet', { 'is-fullscreen': props.isFullscreen }],
      })
    },
  })
}

function mockRectangle (element: Element, rectangle: Rectangle) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => rectangle,
  })
}

function dispatchPointerEvent (
  target: EventTarget,
  type: string,
  options: Partial<PointerEvent>,
) {
  const event = new Event(type, { bubbles: true, cancelable: true })

  for (const [property, value] of Object.entries(options)) {
    Object.defineProperty(event, property, { configurable: true, value })
  }

  target.dispatchEvent(event)
}

async function mountViewport () {
  const pinia = createPinia()

  setActivePinia(pinia)

  const wrapper = mount(WorkspaceViewport, {
    global: {
      plugins: [pinia],
      stubs: {
        BottomPanel: createPanelStub('bottom-panel'),
        EditorPane: createPanelStub('editor-pane'),
        PrimarySidebar: createPanelStub('primary-sidebar'),
        SecondarySidebar: createPanelStub('secondary-sidebar'),
      },
    },
  })
  const rectangles: Record<string, Rectangle> = {
    '.bottom-panel': { bottom: 700, height: 212, left: 0, right: 1000, top: 488, width: 1000 },
    '.editor-pane': { bottom: 480, height: 480, left: 288, right: 672, top: 0, width: 384 },
    '.primary-sidebar': { bottom: 480, height: 480, left: 0, right: 280, top: 0, width: 280 },
    '.secondary-sidebar': { bottom: 480, height: 480, left: 680, right: 1000, top: 0, width: 320 },
    '.workspace-viewport': { bottom: 700, height: 700, left: 0, right: 1000, top: 0, width: 1000 },
  }

  for (const [selector, rectangle] of Object.entries(rectangles)) {
    mockRectangle(wrapper.find(String(selector)).element, rectangle)
  }

  window.dispatchEvent(new Event('resize'))
  await nextTick()

  return wrapper
}

describe('WorkspaceViewport', () => {
  it('exposes resize handles as keyboard-operable separators', async () => {
    const wrapper = await mountViewport()
    const store = useUserPreferencesStore()
    const primaryHandle = wrapper.find('[data-resize-handle="vertical-primary-sidebar"]')
    const bottomHandle = wrapper.find('[data-resize-handle="horizontal-bottom-panel"]')

    expect(primaryHandle.attributes()).toMatchObject({
      'aria-orientation': 'vertical',
      'aria-valuemax': '720',
      'aria-valuemin': '160',
      'aria-valuenow': '280',
      'role': 'separator',
      'tabindex': '0',
    })
    expect(bottomHandle.attributes()).toMatchObject({
      'aria-orientation': 'horizontal',
      'aria-valuenow': '220',
      'role': 'separator',
      'tabindex': '0',
    })

    await primaryHandle.trigger('keydown', { key: 'ArrowRight' })
    await bottomHandle.trigger('keydown', { key: 'ArrowUp', shiftKey: true })

    expect(store.layout.primarySidebarWidth).toBe(296)
    expect(store.layout.panelHeight).toBe(268)
  })

  it('ignores pointer events that did not initiate the resize', async () => {
    const wrapper = await mountViewport()
    const store = useUserPreferencesStore()
    const primaryHandle = wrapper.find('[data-resize-handle="vertical-primary-sidebar"]')

    dispatchPointerEvent(primaryHandle.element, 'pointerdown', {
      button: 0,
      clientX: 284,
      clientY: 240,
      isPrimary: true,
      pointerId: 1,
    })
    dispatchPointerEvent(window, 'pointermove', {
      clientX: 420,
      clientY: 240,
      pointerId: 2,
    })
    dispatchPointerEvent(window, 'pointerup', { pointerId: 2 })

    expect(primaryHandle.attributes('aria-valuenow')).toBe('280')
    expect(store.layout.primarySidebarWidth).toBe(280)

    dispatchPointerEvent(window, 'pointermove', {
      clientX: 300,
      clientY: 240,
      pointerId: 1,
    })
    await nextTick()

    expect(primaryHandle.attributes('aria-valuenow')).toBe('296')
    expect(store.layout.primarySidebarWidth).toBe(280)

    dispatchPointerEvent(window, 'pointerup', { pointerId: 1 })

    expect(store.layout.primarySidebarWidth).toBe(296)
  })
})
