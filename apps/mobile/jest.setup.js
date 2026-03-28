// Prevent Expo's winter runtime from installing ESM-dependent lazy globals.
// Expo installGlobal.ts sets structuredClone as a lazy getter that tries to
// dynamically import from runtime.native.ts — which fails in Jest CJS mode.
// Override the getter with a real implementation before any test code runs.
Object.defineProperty(global, 'structuredClone', {
  // Node 17+ has native structuredClone; provide a safe JSON fallback for safety
  value: function structuredClone(obj) {
    if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) return obj;
    return JSON.parse(JSON.stringify(obj));
  },
  writable: true,
  configurable: true,
});

// Stub out Expo's import.meta registry
global.__ExpoImportMetaRegistry = { registry: new Map() };
