/**
 * FingerprinterJS v2.0
 * Main Entry Point
 */

// Main exports
export { Fingerprint, Fingerprint as default } from "./fingerprint";

// Type exports
export type {
    AudioData, BatteryData, ClientHintsData, CollectorMetadata,
    CollectorResult, ComponentCollector, ConnectionData, FingerprintOptions,
    FingerprintResult, HardwareData, MathData,
    MediaDevicesData, PermissionsData,
    // Component types
    ScreenData, StorageData, TouchData, WebGLData, WebRTCData
} from "./types";

export { FingerprintError, VERSION } from "./types";

// Suspect analysis exports
export { SuspectAnalyzer } from "./suspect-analyzer";
export type { SuspectAnalysis, SuspectSignal } from "./suspect-analyzer";

// Utility exports
export { isBrowser, safeGet, safeStringify, sha256, simpleHash } from "./utils";

// Collector exports for advanced usage
export {
    AsyncBaseCollector,
    // Advanced
    AudioCollector,
    // Base
    BaseCollector, BatteryCollector,
    // Graphics
    CanvasCollector, ClientHintsCollector, ConnectionCollector, FontsCollector,
    // New v2.0
    HardwareCollector, LanguageCollector, MathCollector,
    MediaDevicesCollector, PermissionsCollector, PluginsCollector, ScreenCollector, StorageCollector, TimezoneCollector, TouchCollector,
    // Basic
    UserAgentCollector, WebGLCollector, WebRTCCollector
} from "./collectors";

