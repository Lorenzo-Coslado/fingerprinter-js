/**
 * Hardware Collector
 * Collects hardware-related information
 */

import { CollectorMetadata, HardwareData } from "../types";
import { BaseCollector } from "./base";

/**
 * Hardware Collector
 * Collects CPU, memory, and device information
 */
export class HardwareCollector extends BaseCollector<HardwareData> {
  readonly name = "hardware";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "hardware",
    {
      weight: 8,
      entropy: 8,
      stable: true,
      category: "hardware",
    }
  );

  collect(): HardwareData {
    return this.safeCollect<HardwareData>(
      (): HardwareData => {
        const nav = navigator as any;

        return {
          hardwareConcurrency: nav.hardwareConcurrency || 0,
          deviceMemory: nav.deviceMemory || null,
          platform: nav.platform || "unknown",
          maxTouchPoints: nav.maxTouchPoints || 0,
          oscpu: nav.oscpu, // Firefox only
        };
      },
      {
        hardwareConcurrency: 0,
        deviceMemory: null,
        platform: "unknown",
        maxTouchPoints: 0,
      }
    );
  }
}
