import '@testing-library/jest-dom/vitest'

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as typeof ResizeObserver
}
