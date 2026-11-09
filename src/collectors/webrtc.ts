import type { CollectorContext, WebRTCData } from '../types';
import { AsyncBaseCollector, BaseCollector } from './base';

type RTCWindow = Window & {
  RTCPeerConnection?: typeof RTCPeerConnection;
  webkitRTCPeerConnection?: typeof RTCPeerConnection;
  mozRTCPeerConnection?: typeof RTCPeerConnection;
};
export class WebRTCCollector extends AsyncBaseCollector<WebRTCData> {
  readonly name = 'webrtc';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'network',
    stable: false,
    network: true,
  });
  private readonly iceServers: RTCIceServer[];
  constructor(options: { iceServers?: RTCIceServer[] } = {}) {
    super();
    this.iceServers = options.iceServers ?? [];
  }
  private constructorClass(): typeof RTCPeerConnection | undefined {
    if (typeof window === 'undefined') return undefined;
    const win = window as RTCWindow;
    return win.RTCPeerConnection || win.webkitRTCPeerConnection || win.mozRTCPeerConnection;
  }
  isSupported(): boolean {
    return super.isSupported() && typeof this.constructorClass() === 'function';
  }
  async collect(context?: CollectorContext): Promise<WebRTCData> {
    this.requireSupported(context);
    const Constructor = this.constructorClass();
    if (!Constructor) throw new Error('WebRTC disappeared during collection');
    const peer = new Constructor({ iceServers: this.iceServers });
    const addresses = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      peer.onicecandidate = null;
      peer.close();
    };
    context?.onCleanup(cleanup);
    try {
      const candidates = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, Math.min(3000, this.timeout));
        peer.onicecandidate = (event) => {
          if (!event.candidate) {
            resolve();
            return;
          }
          const address = event.candidate.address || event.candidate.candidate.split(/\s+/)[4];
          if (address && address !== '0.0.0.0' && address !== '::') addresses.add(address);
        };
      });
      const work = async (): Promise<WebRTCData> => {
        peer.createDataChannel('');
        const offer = await peer.createOffer();
        if (context?.signal.aborted) throw new DOMException('Collection cancelled', 'AbortError');
        await peer.setLocalDescription(offer);
        await candidates;
        const candidateAddresses = [...addresses].sort();
        return {
          hasWebRTC: true,
          candidateAddresses,
          localIPs: candidateAddresses.filter((address) => !address.endsWith('.local')),
        };
      };
      return await this.withTimeout(work(), undefined, context?.signal);
    } finally {
      cleanup();
    }
  }
}
