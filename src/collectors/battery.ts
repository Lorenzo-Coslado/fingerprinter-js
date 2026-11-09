import type { BatteryData, CollectorContext } from '../types';
import { AsyncBaseCollector, BaseCollector } from './base';

interface BatteryManager {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
}
type BatteryNavigator = Navigator & { getBattery?: () => Promise<BatteryManager> };
export class BatteryCollector extends AsyncBaseCollector<BatteryData> {
  readonly name = 'battery';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'hardware',
    stable: false,
  });
  isSupported(): boolean {
    return super.isSupported() && typeof (navigator as BatteryNavigator).getBattery === 'function';
  }
  async collect(context?: CollectorContext): Promise<BatteryData> {
    this.requireSupported(context);
    const battery = await this.withTimeout(
      (navigator as Required<BatteryNavigator>).getBattery(),
      undefined,
      context?.signal,
    );
    return {
      supported: true,
      charging: battery.charging,
      level: battery.level,
      chargingTime: Number.isFinite(battery.chargingTime) ? battery.chargingTime : null,
      dischargingTime: Number.isFinite(battery.dischargingTime) ? battery.dischargingTime : null,
    };
  }
}
