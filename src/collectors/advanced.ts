/**
 * Advanced Collectors
 * Audio and Fonts fingerprinting
 */

import { AudioData, CollectorMetadata } from "../types";
import { AsyncBaseCollector, BaseCollector } from "./base";

/**
 * Audio Collector
 * Creates a fingerprint based on audio processing
 */
export class AudioCollector extends AsyncBaseCollector<AudioData> {
  readonly name = "audio";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata("audio", {
    weight: 8,
    entropy: 10,
    stable: false, // Audio fingerprint can vary on first run
    category: "audio",
  });

  isSupported(): boolean {
    return (
      super.isSupported() &&
      (typeof AudioContext !== "undefined" ||
        typeof (window as any).webkitAudioContext !== "undefined")
    );
  }

  async collect(): Promise<AudioData> {
    if (!this.isSupported()) {
      return { error: "audio-not-available" } as AudioData;
    }

    return this.withTimeout(this.collectAudio(), {
      error: "audio-timeout",
    } as AudioData);
  }

  private async collectAudio(): Promise<AudioData> {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return { error: "no-audio-context" } as AudioData;
    }

    const audioContext = new AudioContextClass();
    const result: Partial<AudioData> = {};

    try {
      result.sampleRate = audioContext.sampleRate;
      result.state = audioContext.state;
      result.maxChannelCount = audioContext.destination.maxChannelCount;
      result.channelCount = audioContext.destination.channelCount;
      result.channelCountMode = audioContext.destination.channelCountMode;
      result.channelInterpretation =
        audioContext.destination.channelInterpretation;

      // Create audio fingerprint using oscillator
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      let audioFingerprint = "";
      scriptProcessor.onaudioprocess = () => {
        const freqData = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(freqData);

        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += Math.abs(freqData[i]);
        }
        audioFingerprint = sum.toString();
      };

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);

      await new Promise((resolve) => setTimeout(resolve, 100));

      result.audioFingerprint = audioFingerprint;
      await audioContext.close();

      return result as AudioData;
    } catch (error) {
      try {
        await audioContext.close();
      } catch {}
      return {
        error: "audio-processing-failed",
      } as AudioData;
    }
  }
}

/**
 * Fonts Collector
 * Detects available fonts on the system
 */
export class FontsCollector extends BaseCollector<string[]> {
  readonly name = "fonts";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata("fonts", {
    weight: 8,
    entropy: 12,
    stable: true,
    category: "browser",
  });

  private readonly testFonts = [
    "Arial",
    "Arial Black",
    "Arial Narrow",
    "Arial Rounded MT Bold",
    "Bookman Old Style",
    "Bradley Hand ITC",
    "Century",
    "Century Gothic",
    "Comic Sans MS",
    "Courier",
    "Courier New",
    "Georgia",
    "Gentium",
    "Helvetica",
    "Helvetica Neue",
    "Impact",
    "King",
    "Lucida Console",
    "Lalit",
    "Modena",
    "Monotype Corsiva",
    "Papyrus",
    "Tahoma",
    "TeX",
    "Times",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana",
    "Verona",
    // Additional common fonts
    "Monaco",
    "Consolas",
    "Lucida Sans Unicode",
    "Palatino Linotype",
    "Segoe UI",
    "Candara",
    "Cambria",
    "Garamond",
    "Perpetua",
    "Rockwell",
    "Franklin Gothic Medium",
  ];

  isSupported(): boolean {
    return super.isSupported() && typeof document !== "undefined";
  }

  collect(): string[] {
    if (!this.isSupported()) {
      return [];
    }

    return this.safeCollect(() => {
      const availableFonts: string[] = [];
      const testString = "mmmmmmmmmmlli";
      const testSize = "72px";
      const body = document.getElementsByTagName("body")[0];

      if (!body) return [];

      // Create test span element
      const span = document.createElement("span");
      span.style.fontSize = testSize;
      span.style.position = "absolute";
      span.style.left = "-9999px";
      span.style.visibility = "hidden";
      span.innerHTML = testString;
      body.appendChild(span);

      // Get default width and height
      span.style.fontFamily = "monospace";
      const defaultWidth = span.offsetWidth;
      const defaultHeight = span.offsetHeight;

      // Test each font
      for (const font of this.testFonts) {
        span.style.fontFamily = `'${font}', monospace`;
        if (
          span.offsetWidth !== defaultWidth ||
          span.offsetHeight !== defaultHeight
        ) {
          availableFonts.push(font);
        }
      }

      body.removeChild(span);
      return availableFonts;
    }, []);
  }
}
