// Main exports
export { Fingerprint as default, Fingerprint } from "./fingerprint";

// Type exports
export type {
  ComponentCollector,
  FingerprintOptions,
  FingerprintResult,
} from "./types";

// Utility exports
export { isBrowser, safeGet, safeStringify, sha256, simpleHash } from "./utils";

// Collector exports for advanced usage
export {
  LanguageCollector,
  PluginsCollector,
  ScreenCollector,
  TimezoneCollector,
  UserAgentCollector,
} from "./collectors/basic";

export { CanvasCollector, WebGLCollector } from "./collectors/canvas";

export { AudioCollector, FontsCollector } from "./collectors/advanced";
