/** Public contracts for FingerprinterJS. Observations are not identity attestations. */
import type { SuspectAnalysis } from './suspect-analyzer';
export { VERSION } from './version';

export const FINGERPRINT_VERSION = '3';
export type FingerprintProfile = 'minimal' | 'balanced' | 'diagnostic';
export type CollectorCategory =
  'browser' | 'hardware' | 'network' | 'graphics' | 'audio' | 'storage' | 'permissions';
export type CollectorName =
  | 'userAgent'
  | 'language'
  | 'timezone'
  | 'screen'
  | 'plugins'
  | 'canvas'
  | 'webgl'
  | 'audio'
  | 'fonts'
  | 'hardware'
  | 'webrtc'
  | 'clientHints'
  | 'storage'
  | 'battery'
  | 'connection'
  | 'touch'
  | 'permissions'
  | 'math'
  | 'mediaDevices';
export type CollectorStatus =
  'ok' | 'unsupported' | 'blocked' | 'timeout' | 'error' | 'excluded' | 'aborted';
export interface CollectorMetadata {
  name: string;
  category: CollectorCategory;
  /** Whether this collector has a projection in fingerprint schema 3. */
  stable: boolean;
  description?: string;
  network?: boolean;
  /** @deprecated Not a measured probability or confidence weight. */
  weight?: number;
  /** @deprecated Entropy is not measured by this SDK. */
  entropy?: number;
}
export interface CollectorDescriptor extends CollectorMetadata {
  description: string;
  network: boolean;
  profiles: FingerprintProfile[];
}
export interface CollectorContext {
  signal: AbortSignal;
  /** Register per-invocation cleanup, also called on timeout or cancellation. */
  onCleanup(cleanup: () => void): void;
}
export interface ComponentCollector<T = unknown> {
  readonly name: string;
  readonly metadata: CollectorMetadata;
  collect(context?: CollectorContext): Promise<T> | T;
  isSupported(): boolean;
  /** Custom collectors enter the hash only with an explicit projection. */
  project?(value: T): unknown;
}
export type CollectorResult<T = unknown> =
  | { status: 'ok'; value?: T; duration: number; reason?: never }
  | { status: Exclude<CollectorStatus, 'ok'>; value?: never; duration: number; reason: string };
export type Components = Partial<ComponentData> & Record<string, unknown>;
export type CollectorResults = { [K in CollectorName]: CollectorResult<ComponentData[K]> } & Record<
  string,
  CollectorResult
>;
export interface AutomationData {
  webdriver?: boolean;
  headless?: boolean;
  selenium?: boolean;
  puppeteer?: boolean;
  playwright?: boolean;
  phantom?: boolean;
  cdp?: boolean;
}
export interface ComponentData {
  userAgent: string;
  language: string[];
  timezone: string;
  screen: ScreenData;
  plugins: Array<{ name: string; description: string; filename: string }>;
  canvas: string;
  webgl: WebGLData;
  audio: AudioData;
  fonts: string[];
  hardware: HardwareData;
  webrtc: WebRTCData;
  clientHints: ClientHintsData;
  storage: StorageData;
  battery: BatteryData;
  connection: ConnectionData;
  touch: TouchData;
  permissions: PermissionsData;
  math: MathData;
  mediaDevices: MediaDevicesData;
  automation: AutomationData;
  custom: Record<string, unknown>;
}
export interface FingerprintOptions {
  profile?: FingerprintProfile;
  /** Exact built-in selection. An empty array disables all built-ins. */
  collectors?: CollectorName[];
  customCollectors?: ComponentCollector[];
  excludeUserAgent?: boolean;
  excludeScreenResolution?: boolean;
  excludeTimezone?: boolean;
  excludeLanguage?: boolean;
  excludePlugins?: boolean;
  excludeCanvas?: boolean;
  excludeWebGL?: boolean;
  excludeAudio?: boolean;
  excludeFonts?: boolean;
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
  /** Context returned to the caller; never hashed. No fields are guessed or removed. */
  customData?: Record<string, unknown>;
  /** Explicit caller-controlled JSON data included in the hash. */
  fingerprintData?: Record<string, unknown>;
  /** Domain separation, not a secret or an anonymity guarantee. */
  namespace?: string;
  /** @deprecated customData is always preserved and is never hashed in v3. */
  allowUnstableData?: boolean;
  includeSuspectAnalysis?: boolean;
  /** Hide values in both components and collectorResults; retain statuses and timings. */
  includeComponents?: boolean;
  /** Per-collector deadline in ms. */
  timeout?: number;
  /** Total collection budget in ms, shared by parallel and serial collection. */
  timeBudget?: number;
  parallel?: boolean;
  signal?: AbortSignal;
  /** WebRTC requires explicit network permission and explicit collector selection. */
  network?: 'disabled' | 'enabled';
  /** No third-party STUN/TURN server is configured by default. */
  iceServers?: RTCIceServer[];
}
export type GenerationOptions = Pick<FingerprintOptions, 'signal' | 'includeComponents'>;
export const DEFAULT_OPTIONS = {
  profile: 'balanced' as FingerprintProfile,
  timeout: 5000,
  timeBudget: 1000,
  parallel: true,
  network: 'disabled' as const,
  includeComponents: true,
};
export interface FingerprintResult {
  fingerprint: string;
  fingerprintVersion: typeof FINGERPRINT_VERSION;
  /** Names whose successful projections contributed to this hash. */
  hashComponents: string[];
  /** Empty means no browser projection or explicit fingerprintData was available. */
  quality: 'complete' | 'partial' | 'empty';
  components: Components;
  collectorResults: CollectorResults;
  /** Percentage of selected collectors whose observations succeeded, not identity accuracy. */
  collectionCoverage: number;
  /** @deprecated Alias of collectionCoverage, never a probability of identity. */
  confidence: number;
  /** @deprecated Not measured. Always null. */
  entropy: null;
  duration: number;
  version: string;
  suspectAnalysis?: SuspectAnalysis;
}
export interface ComponentChange {
  name: string;
  type: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
}
export interface FingerprintComparison {
  sameFingerprint: boolean;
  sameVersion: boolean;
  changes: ComponentChange[];
}

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
  candidateAddresses: string[];
  /** @deprecated Candidate addresses may be public; use candidateAddresses. */
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
  chargingTime?: number | null;
  dischargingTime?: number | null;
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

export type FingerprintErrorCode =
  | 'NOT_BROWSER'
  | 'COLLECTOR_TIMEOUT'
  | 'COLLECTOR_ERROR'
  | 'HASH_ERROR'
  | 'UNSUPPORTED'
  | 'BLOCKED'
  | 'ABORTED'
  | 'INVALID_INPUT';
export class FingerprintError extends Error {
  constructor(
    message: string,
    public readonly code: FingerprintErrorCode,
    public readonly collector?: string,
  ) {
    super(message);
    this.name = 'FingerprintError';
  }
}
