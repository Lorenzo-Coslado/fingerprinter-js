import type { HardwareData } from '../types';
import { BaseCollector } from './base';

type HardwareNavigator = Navigator & { deviceMemory?: number; oscpu?: string };
export class HardwareCollector extends BaseCollector<HardwareData> {
  readonly name = 'hardware';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'hardware',
    stable: true,
  });
  collect(): HardwareData {
    this.requireSupported();
    const nav = navigator as HardwareNavigator;
    return {
      hardwareConcurrency: nav.hardwareConcurrency || 0,
      deviceMemory: nav.deviceMemory ?? null,
      platform: nav.platform || 'unknown',
      maxTouchPoints: nav.maxTouchPoints || 0,
      ...(nav.oscpu ? { oscpu: nav.oscpu } : {}),
    };
  }
}
