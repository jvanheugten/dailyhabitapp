import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// ResizeObserver is not available in jsdom
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
