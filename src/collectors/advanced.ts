import type { AudioData, CollectorContext } from '../types';
import { FingerprintError } from '../types';
import { sha256Fallback } from '../utils';
import { AsyncBaseCollector, BaseCollector } from './base';

type AudioWindow = Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext };
/** Offline rendering never starts audible playback and uses a fixed, bounded buffer. */
export class AudioCollector extends AsyncBaseCollector<AudioData> {
  readonly name = 'audio';
  readonly metadata = BaseCollector.createMetadata(this.name, { category: 'audio', stable: false });
  isSupported(): boolean {
    return (
      super.isSupported() &&
      typeof (window.OfflineAudioContext || (window as AudioWindow).webkitOfflineAudioContext) ===
        'function'
    );
  }
  async collect(context?: CollectorContext): Promise<AudioData> {
    this.requireSupported(context);
    const Constructor =
      window.OfflineAudioContext || (window as AudioWindow).webkitOfflineAudioContext;
    if (!Constructor)
      throw new FingerprintError('Offline audio is unavailable', 'UNSUPPORTED', this.name);
    const offline = new Constructor(1, 4410, 44100);
    const oscillator = offline.createOscillator();
    const compressor = offline.createDynamicsCompressor();
    const cleanup = (): void => {
      oscillator.disconnect();
      compressor.disconnect();
    };
    context?.onCleanup(cleanup);
    try {
      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;
      oscillator.connect(compressor);
      compressor.connect(offline.destination);
      oscillator.start(0);
      oscillator.stop(0.1);
      const buffer = await this.withTimeout(offline.startRendering(), undefined, context?.signal);
      const samples = buffer.getChannelData(0).slice(-1000);
      return {
        sampleRate: offline.sampleRate,
        state: offline.state,
        maxChannelCount: offline.destination.maxChannelCount,
        channelCount: offline.destination.channelCount,
        channelCountMode: offline.destination.channelCountMode,
        channelInterpretation: offline.destination.channelInterpretation,
        audioFingerprint: sha256Fallback(Array.from(samples).join(',')),
      };
    } finally {
      cleanup();
    }
  }
}

export class FontsCollector extends BaseCollector<string[]> {
  readonly name = 'fonts';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'browser',
    stable: true,
  });
  private readonly testFonts = [
    'Arial',
    'Arial Black',
    'Arial Narrow',
    'Arial Rounded MT Bold',
    'Bookman Old Style',
    'Bradley Hand ITC',
    'Century',
    'Century Gothic',
    'Comic Sans MS',
    'Courier',
    'Courier New',
    'Georgia',
    'Gentium',
    'Helvetica',
    'Helvetica Neue',
    'Impact',
    'King',
    'Lucida Console',
    'Lalit',
    'Modena',
    'Monotype Corsiva',
    'Papyrus',
    'Tahoma',
    'TeX',
    'Times',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Verona',
    // Additional common fonts
    'Monaco',
    'Consolas',
    'Lucida Sans Unicode',
    'Palatino Linotype',
    'Segoe UI',
    'Candara',
    'Cambria',
    'Garamond',
    'Perpetua',
    'Rockwell',
    'Franklin Gothic Medium',
  ];

  isSupported(): boolean {
    return super.isSupported() && document.body !== null;
  }
  collect(): string[] {
    this.requireSupported();
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText =
      'all:initial;position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;contain:layout style;';
    const bases = ['monospace', 'sans-serif', 'serif'];
    const create = (family: string): HTMLSpanElement => {
      const span = document.createElement('span');
      span.textContent = 'mmmmmmmmmmlli';
      span.style.cssText =
        'all:initial;display:inline-block;font-size:72px;line-height:normal;letter-spacing:normal;';
      span.style.fontFamily = family;
      container.appendChild(span);
      return span;
    };
    const defaults = bases.map(create);
    const candidates = this.testFonts.map((font) => ({
      font,
      samples: bases.map((base) => create(`'${font}', ${base}`)),
    }));
    try {
      // Batch all style writes before measuring, rather than forcing layout per font.
      document.body.appendChild(container);
      const dimensions = defaults.map((span) => [span.offsetWidth, span.offsetHeight]);
      return candidates
        .filter((candidate) =>
          candidate.samples.some(
            (span, index) =>
              span.offsetWidth !== dimensions[index][0] ||
              span.offsetHeight !== dimensions[index][1],
          ),
        )
        .map((candidate) => candidate.font);
    } finally {
      container.remove();
    }
  }
}
