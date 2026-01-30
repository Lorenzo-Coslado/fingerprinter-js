/**
 * Collector Index
 * Exports all collectors from a single file
 */

// Base collector
export { AsyncBaseCollector, BaseCollector } from "./base";

// Basic collectors
export {
    LanguageCollector, PluginsCollector, ScreenCollector, TimezoneCollector, UserAgentCollector
} from "./basic";

// Graphics collectors
export { CanvasCollector, WebGLCollector } from "./canvas";

// Advanced collectors
export { AudioCollector, FontsCollector } from "./advanced";

// New v2.0 collectors
export { BatteryCollector } from "./battery";
export { ClientHintsCollector } from "./clienthints";
export { ConnectionCollector } from "./connection";
export { HardwareCollector } from "./hardware";
export { MathCollector } from "./math";
export { MediaDevicesCollector } from "./media";
export { PermissionsCollector } from "./permissions";
export { StorageCollector } from "./storage";
export { TouchCollector } from "./touch";
export { WebRTCCollector } from "./webrtc";

