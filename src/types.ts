import { SuspectAnalysis } from "./suspect-analyzer";

/**
 * Interface for fingerprint options
 */
export interface FingerprintOptions {
  excludeScreenResolution?: boolean;
  excludeTimezone?: boolean;
  excludeLanguage?: boolean;
  excludeCanvas?: boolean;
  excludeWebGL?: boolean;
  excludeAudio?: boolean;
  excludePlugins?: boolean;
  excludeFonts?: boolean;
  customData?: Record<string, any>;
  allowUnstableData?: boolean; // Allow including temporal data (default: false)
  includeSuspectAnalysis?: boolean; // Include suspect analysis (default: false)
}

/**
 * Interface for fingerprint result
 */
export interface FingerprintResult {
  fingerprint: string;
  components: Record<string, any>;
  confidence: number;
  suspectAnalysis?: SuspectAnalysis; // Optional suspect analysis
}

/**
 * Interface for component collectors
 */
export interface ComponentCollector {
  name: string;
  collect(): Promise<any> | any;
}
