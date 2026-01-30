/**
 * Battery Collector
 * Collects battery status information (where available)
 */

import { BatteryData, CollectorMetadata } from "../types";
import { AsyncBaseCollector, BaseCollector } from "./base";

interface BatteryManager {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
}

/**
 * Battery Collector
 * Note: Battery API is deprecated but still works in some browsers
 */
export class BatteryCollector extends AsyncBaseCollector<BatteryData> {
  readonly name = "battery";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "battery",
    {
      weight: 3,
      entropy: 3,
      stable: false, // Battery stats change
      category: "hardware",
    }
  );

  isSupported(): boolean {
    return (
      super.isSupported() &&
      "getBattery" in navigator
    );
  }

  async collect(): Promise<BatteryData> {
    if (!this.isSupported()) {
      return { supported: false };
    }

    return this.withTimeout(this.collectBattery(), { supported: false });
  }

  private async collectBattery(): Promise<BatteryData> {
    try {
      const battery = await (navigator as any).getBattery() as BatteryManager;

      return {
        supported: true,
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      };
    } catch {
      return { supported: false };
    }
  }
}
