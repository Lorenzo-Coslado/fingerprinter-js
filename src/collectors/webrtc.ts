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
    const localIPs = new Set<string>();

    try {
      const RTCPeerConnectionClass =
        window.RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;

      const pc = new RTCPeerConnectionClass({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Listen for ICE candidates - this is where local IPs are revealed
      const candidatePromise = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 3000); // Max 3 seconds

        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            // ICE gathering complete
            clearTimeout(timeout);
            resolve();
            return;
          }

          const candidate = event.candidate.candidate;
          
          // Extract IP from ICE candidate string
          // Format: "candidate:... typ host ..." or "candidate:... typ srflx raddr IP ..."
          const ipv4Match = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
          const ipv6Match = candidate.match(/([a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}/);
          
          if (ipv4Match) {
            const ip = ipv4Match[0];
            // Filter out invalid IPs
            if (ip !== "0.0.0.0" && !ip.startsWith("0.") && !ip.startsWith("127.")) {
              localIPs.add(ip);
            }
          }
          
          if (ipv6Match) {
            const ip = ipv6Match[0];
            // Filter out loopback
            if (ip !== "::1") {
              localIPs.add(ip);
            }
          }

          // Also check for address field directly
          if (event.candidate.address) {
            const addr = event.candidate.address;
            // Skip mDNS addresses (UUID-like format used by Chrome)
            if (!addr.includes("-") && !addr.endsWith(".local")) {
              localIPs.add(addr);
            }
          }
        };
      });

      pc.createDataChannel("");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE candidates
      await candidatePromise;

      // Also extract from final SDP
      const sdp = pc.localDescription?.sdp || "";
      const sdpIpMatches = sdp.match(/(?:^|\s)([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})(?:\s|$)/gm);
      if (sdpIpMatches) {
        sdpIpMatches.forEach((match) => {
          const ip = match.trim();
          if (ip !== "0.0.0.0" && !ip.startsWith("0.") && !ip.startsWith("127.")) {
            localIPs.add(ip);
          }
        });
      }

      pc.close();

      return {
        hasWebRTC: true,
        localIPs: Array.from(localIPs),
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
