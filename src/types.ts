/**
 * FingerprinterJS v2.0 Types
 * Enterprise-grade type definitions
 */

import { SuspectAnalysis } from "./suspect-analyzer";

// ============================================================
// Core Types
// ============================================================

/**
 * Result wrapper for collector data with metadata
 */
export interface CollectorResult<T = unknown> {
  value: T;
  duration: number;
  error?: string;
}

/**
 * Collector metadata for entropy and weight calculation
 */
export interface CollectorMetadata {
  /** Unique collector identifier */
  name: string;
  /** Weight for confidence calculation (0-10) */
  weight: number;
  /** Estimated entropy contribution (bits) */
  entropy: number;
  /** Is this collector stable across sessions */
  stable: boolean;
  /** Category for grouping */
  category: CollectorCategory;
}

/**
 * Collector category for organization
 */
export type CollectorCategory =
  | "browser"
  | "hardware"
  | "network"
  | "graphics"
  | "audio"
  | "storage"
  | "permissions";

// ============================================================
// Collector Interface
// ============================================================

/**
 * Interface for component collectors
 */
export interface ComponentCollector<T = unknown> {
  /** Collector name/identifier */
  name: string;
  /** Collector metadata */
  metadata: CollectorMetadata;
  /** Collect fingerprint data */
  collect(): Promise<T> | T;
  /** Check if collector is supported in current environment */
  isSupported(): boolean;
}

// ============================================================
// Fingerprint Options
// ============================================================

/**
 * Options for fingerprint generation
 */
export interface FingerprintOptions {
  // Basic collectors
  excludeUserAgent?: boolean;
  excludeScreenResolution?: boolean;
  excludeTimezone?: boolean;
  excludeLanguage?: boolean;
  excludePlugins?: boolean;

  // Graphics collectors
  excludeCanvas?: boolean;
  excludeWebGL?: boolean;

  // Advanced collectors
  excludeAudio?: boolean;
  excludeFonts?: boolean;

  // New v2.0 collectors
  excludeWebRTC?: boolean;
  excludeHardware?: boolean;
  excludeClientHints?: boolean;
  excludeStorage?: boolean;
  excludeBattery?: boolean;
  excludeConnection?: boolean;
  excludeTouch?: boolean;
  excludePermissions?: boolean;
  excludeMath?: boolean;
  excludeMediaDevices?: boolean;

  // Custom data
  customData?: Record<string, unknown>;
  allowUnstableData?: boolean;

  // Analysis
  includeSuspectAnalysis?: boolean;

  // Performance
  timeout?: number; // Collector timeout in ms (default: 5000)
  parallel?: boolean; // Run collectors in parallel (default: true)
}

/**
 * Default options
 */
export const DEFAULT_OPTIONS: Required<
  Pick<FingerprintOptions, "timeout" | "parallel" | "allowUnstableData">
> = {
  timeout: 5000,
  parallel: true,
  allowUnstableData: false,
};

// ============================================================
// Fingerprint Result
// ============================================================

/**
 * Result of fingerprint generation
 */
export interface FingerprintResult {
  /** SHA-256 fingerprint hash */
  fingerprint: string;
  /** Collected component data */
  components: Record<string, unknown>;
  /** Confidence score (0-100) */
  confidence: number;
  /** Estimated entropy in bits */
  entropy: number;
  /** Generation duration in ms */
  duration: number;
  /** Version of the library */
  version: string;
  /** Optional suspect analysis */
  suspectAnalysis?: SuspectAnalysis;
}

// ============================================================
// Component-specific types
// ============================================================

export interface ScreenData {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
}

export interface WebGLData {
  vendor: string;
  renderer: string;
  version: string;
  shadingLanguageVersion: string;
  extensions: string[];
  maxTextureSize: number;
  maxViewportDims: number[];
  maxVertexAttribs: number;
  maxVertexUniformVectors: number;
  maxFragmentUniformVectors: number;
  maxVaryingVectors: number;
  unmaskedVendor?: string;
  unmaskedRenderer?: string;
  error?: string;
}

export interface AudioData {
  sampleRate: number;
  state: string;
  maxChannelCount: number;
  channelCount: number;
  channelCountMode: string;
  channelInterpretation: string;
  audioFingerprint?: string;
  error?: string;
}

export interface HardwareData {
  hardwareConcurrency: number;
  deviceMemory: number | null;
  platform: string;
  maxTouchPoints: number;
  oscpu?: string;
}

export interface WebRTCData {
  hasWebRTC: boolean;
  localIPs: string[];
  sdpFingerprint?: string;
  error?: string;
}

export interface ClientHintsData {
  brands: Array<{ brand: string; version: string }>;
  mobile: boolean;
  platform: string;
  platformVersion?: string;
  architecture?: string;
  model?: string;
  bitness?: string;
  fullVersionList?: Array<{ brand: string; version: string }>;
}

export interface StorageData {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  cookiesEnabled: boolean;
  quotaEstimate: number | null;
}

export interface BatteryData {
  supported: boolean;
  charging?: boolean;
  level?: number;
  chargingTime?: number;
  dischargingTime?: number;
}

export interface ConnectionData {
  supported: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: string;
}

export interface TouchData {
  maxTouchPoints: number;
  touchEvent: boolean;
  pointerEvent: boolean;
  coarsePrimaryPointer: boolean;
}

export interface PermissionsData {
  notifications?: PermissionState;
  geolocation?: PermissionState;
  camera?: PermissionState;
  microphone?: PermissionState;
  push?: PermissionState;
}

export interface MathData {
  tan: string;
  sin: string;
  atan2: string;
  log: string;
  pow: string;
  sqrt: string;
}

export interface MediaDevicesData {
  audioInputs: number;
  audioOutputs: number;
  videoInputs: number;
  hasMediaDevices: boolean;
}

// ============================================================
// Error Types
// ============================================================

export class FingerprintError extends Error {
  constructor(
    message: string,
    public readonly code: FingerprintErrorCode,
    public readonly collector?: string
  ) {
    super(message);
    this.name = "FingerprintError";
  }
}

export type FingerprintErrorCode =
  | "NOT_BROWSER"
  | "COLLECTOR_TIMEOUT"
  | "COLLECTOR_ERROR"
  | "HASH_ERROR"
  | "UNSUPPORTED";

// ============================================================
// Library Version
// ============================================================

export const VERSION = "2.0.0";
