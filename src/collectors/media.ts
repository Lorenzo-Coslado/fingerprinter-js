/**
 * Media Devices Collector
 * Enumerates available media input/output devices
 */

import { CollectorMetadata, MediaDevicesData } from "../types";
import { AsyncBaseCollector, BaseCollector } from "./base";

/**
 * Media Devices Collector
 * Counts cameras, microphones, and speakers
 */
export class MediaDevicesCollector extends AsyncBaseCollector<MediaDevicesData> {
  readonly name = "mediaDevices";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "mediaDevices",
    {
      weight: 5,
      entropy: 5,
      stable: true,
      category: "hardware",
    }
  );

  isSupported(): boolean {
    return (
      super.isSupported() &&
      "mediaDevices" in navigator &&
      typeof navigator.mediaDevices.enumerateDevices === "function"
    );
  }

  async collect(): Promise<MediaDevicesData> {
    if (!this.isSupported()) {
      return {
        audioInputs: 0,
        audioOutputs: 0,
        videoInputs: 0,
        hasMediaDevices: false,
      };
    }

    return this.withTimeout(this.collectDevices(), {
      audioInputs: 0,
      audioOutputs: 0,
      videoInputs: 0,
      hasMediaDevices: true,
    });
  }

  private async collectDevices(): Promise<MediaDevicesData> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      return {
        audioInputs: devices.filter((d) => d.kind === "audioinput").length,
        audioOutputs: devices.filter((d) => d.kind === "audiooutput").length,
        videoInputs: devices.filter((d) => d.kind === "videoinput").length,
        hasMediaDevices: true,
      };
    } catch {
      return {
        audioInputs: 0,
        audioOutputs: 0,
        videoInputs: 0,
        hasMediaDevices: true,
      };
    }
  }
}
