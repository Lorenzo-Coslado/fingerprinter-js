import type { CollectorContext, MediaDevicesData } from '../types';
import { AsyncBaseCollector, BaseCollector } from './base';

export class MediaDevicesCollector extends AsyncBaseCollector<MediaDevicesData> {
  readonly name = 'mediaDevices';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'hardware',
    stable: false,
  });
  isSupported(): boolean {
    return super.isSupported() && typeof navigator.mediaDevices?.enumerateDevices === 'function';
  }
  async collect(context?: CollectorContext): Promise<MediaDevicesData> {
    this.requireSupported(context);
    const devices = await this.withTimeout(
      navigator.mediaDevices.enumerateDevices(),
      undefined,
      context?.signal,
    );
    return {
      audioInputs: devices.filter((device) => device.kind === 'audioinput').length,
      audioOutputs: devices.filter((device) => device.kind === 'audiooutput').length,
      videoInputs: devices.filter((device) => device.kind === 'videoinput').length,
      hasMediaDevices: true,
    };
  }
}
