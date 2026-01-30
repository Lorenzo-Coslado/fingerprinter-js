/**
 * WebRTC Collector
 * Collects WebRTC-related information including local IPs
 */

import { CollectorMetadata, WebRTCData } from "../types";
import { AsyncBaseCollector, BaseCollector } from "./base";

/**
 * WebRTC Collector
 * Can reveal local IP addresses and network topology
 */
export class WebRTCCollector extends AsyncBaseCollector<WebRTCData> {
  readonly name = "webrtc";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "webrtc",
    {
      weight: 7,
      entropy: 8,
      stable: false, // IPs can change
      category: "network",
    }
  );

  isSupported(): boolean {
    return (
      super.isSupported() &&
      (typeof RTCPeerConnection !== "undefined" ||
        typeof (window as any).webkitRTCPeerConnection !== "undefined" ||
        typeof (window as any).mozRTCPeerConnection !== "undefined")
    );
  }

  async collect(): Promise<WebRTCData> {
    if (!this.isSupported()) {
      return { hasWebRTC: false, localIPs: [] };
    }

    return this.withTimeout(this.collectWebRTC(), {
      hasWebRTC: true,
      localIPs: [],
      error: "timeout",
    });
  }

  private async collectWebRTC(): Promise<WebRTCData> {
    const localIPs: string[] = [];

    try {
      const RTCPeerConnectionClass =
        window.RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;

      const pc = new RTCPeerConnectionClass({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      pc.createDataChannel("");

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Extract IPs from SDP
      const sdp = pc.localDescription?.sdp || "";
      const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/g;
      const ipv6Regex = /([a-f0-9]{1,4}:){7}[a-f0-9]{1,4}/gi;

      const ipMatches = sdp.match(ipRegex) || [];
      const ipv6Matches = sdp.match(ipv6Regex) || [];

      // Filter out 0.0.0.0 and common STUN IPs
      const validIPs = [...ipMatches, ...ipv6Matches].filter(
        (ip) =>
          ip !== "0.0.0.0" &&
          !ip.startsWith("0.") &&
          !ip.startsWith("127.")
      );

      localIPs.push(...new Set(validIPs));

      // Wait a bit for ICE candidates
      await new Promise((resolve) => setTimeout(resolve, 500));

      pc.close();

      return {
        hasWebRTC: true,
        localIPs,
        sdpFingerprint: this.hashSDP(sdp),
      };
    } catch (error) {
      return {
        hasWebRTC: true,
        localIPs: [],
        error: (error as Error).message,
      };
    }
  }

  private hashSDP(sdp: string): string {
    // Create a simple hash of relevant SDP parts (excluding variable data)
    const lines = sdp.split("\n").filter(
      (line) =>
        line.startsWith("a=rtpmap") ||
        line.startsWith("a=fmtp") ||
        line.startsWith("a=rtcp-fb")
    );
    return lines.join("|").slice(0, 100);
  }
}
