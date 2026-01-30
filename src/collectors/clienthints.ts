/**
 * Client Hints Collector
 * Collects modern User-Agent Client Hints data
 */

import { ClientHintsData, CollectorMetadata } from "../types";
import { AsyncBaseCollector, BaseCollector } from "./base";

interface NavigatorUAData {
  brands: Array<{ brand: string; version: string }>;
  mobile: boolean;
  platform: string;
  getHighEntropyValues(hints: string[]): Promise<{
    architecture?: string;
    bitness?: string;
    model?: string;
    platformVersion?: string;
    fullVersionList?: Array<{ brand: string; version: string }>;
  }>;
}

/**
 * Client Hints Collector
 * Modern alternative to User-Agent parsing
 */
export class ClientHintsCollector extends AsyncBaseCollector<ClientHintsData> {
  readonly name = "clientHints";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "clientHints",
    {
      weight: 7,
      entropy: 10,
      stable: true,
      category: "browser",
    }
  );

  isSupported(): boolean {
    return (
      super.isSupported() &&
      "userAgentData" in navigator &&
      typeof (navigator as any).userAgentData?.getHighEntropyValues ===
        "function"
    );
  }

  async collect(): Promise<ClientHintsData> {
    if (!this.isSupported()) {
      return {
        brands: [],
        mobile: false,
        platform: "unknown",
      };
    }

    return this.withTimeout(this.collectClientHints(), {
      brands: [],
      mobile: false,
      platform: "unknown",
    });
  }

  private async collectClientHints(): Promise<ClientHintsData> {
    try {
      const uaData = (navigator as any).userAgentData as NavigatorUAData;

      const result: ClientHintsData = {
        brands: uaData.brands || [],
        mobile: uaData.mobile || false,
        platform: uaData.platform || "unknown",
      };

      // Try to get high entropy values
      try {
        const highEntropy = await uaData.getHighEntropyValues([
          "architecture",
          "bitness",
          "model",
          "platformVersion",
          "fullVersionList",
        ]);

        result.architecture = highEntropy.architecture;
        result.bitness = highEntropy.bitness;
        result.model = highEntropy.model;
        result.platformVersion = highEntropy.platformVersion;
        result.fullVersionList = highEntropy.fullVersionList;
      } catch {
        // High entropy values may be blocked
      }

      return result;
    } catch (error) {
      return {
        brands: [],
        mobile: false,
        platform: "unknown",
      };
    }
  }
}
