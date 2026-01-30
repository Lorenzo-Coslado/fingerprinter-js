# FingerprinterJS v2.0

Enterprise-grade browser fingerprinting with **19 collectors** and advanced **bot detection**.

[![Demo](https://img.shields.io/badge/Live-Demo-6366f1)](https://lorenzo-coslado.github.io/fingerprinter-js)
[![Sponsor](https://img.shields.io/badge/Sponsor-❤️-red)](https://github.com/sponsors/Lorenzo-Coslado)
[![npm version](https://img.shields.io/npm/v/fingerprinter-js)](https://www.npmjs.com/package/fingerprinter-js)
[![npm downloads](https://img.shields.io/npm/dt/fingerprinter-js)](https://www.npmjs.com/package/fingerprinter-js)

## 🚀 Features

- **19 Collectors**: userAgent, language, timezone, screen, plugins, canvas, webGL, audio, fonts, hardware, webRTC, clientHints, storage, battery, connection, touch, permissions, math, mediaDevices
- **Bot Detection**: Detects Puppeteer, Playwright, Selenium, PhantomJS, CDP, headless browsers
- **TypeScript**: Full type safety with comprehensive interfaces
- **Modular**: Enable/disable any collector
- **High Entropy**: ~80+ bits of entropy for unique identification
- **Stable**: Smart filtering of temporal data
- **Zero Dependencies**: Lightweight and fast

## 📦 Installation

```bash
npm install fingerprinter-js
```

## 🔧 Quick Start

```javascript
import Fingerprint from "fingerprinter-js";

// Generate fingerprint with bot detection
const result = await Fingerprint.generate({
  includeSuspectAnalysis: true
});

console.log(result.fingerprint);   // "a1b2c3d4e5f6..."
console.log(result.confidence);    // 95
console.log(result.entropy);       // 82
console.log(result.suspectAnalysis.riskLevel); // "LOW"
```

## 📊 Result Structure

```typescript
interface FingerprintResult {
  fingerprint: string;          // SHA-256 hash
  components: Record<string, unknown>;
  confidence: number;           // 0-100
  entropy: number;              // Bits of entropy
  duration: number;             // Generation time (ms)
  version: string;              // Library version
  suspectAnalysis?: {
    score: number;              // 0-100 (0=legit, 100=bot)
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    signals: SuspectSignal[];
  };
}
```

## 🎯 All 19 Collectors

| Collector | Description | Entropy | Exclude Option |
|-----------|-------------|---------|----------------|
| `userAgent` | Browser User-Agent | ~10 bits | `excludeUserAgent` |
| `language` | Preferred languages | ~5 bits | `excludeLanguage` |
| `timezone` | Timezone | ~6 bits | `excludeTimezone` |
| `screen` | Resolution, color depth | ~8 bits | `excludeScreenResolution` |
| `plugins` | Installed plugins | ~6 bits | `excludePlugins` |
| `canvas` | 2D canvas fingerprint | ~12 bits | `excludeCanvas` |
| `webgl` | WebGL info | ~15 bits | `excludeWebGL` |
| `audio` | Audio processing | ~10 bits | `excludeAudio` |
| `fonts` | Available fonts | ~12 bits | `excludeFonts` |
| `hardware` | CPU cores, memory | ~8 bits | `excludeHardware` |
| `webrtc` | Local IPs | ~8 bits | `excludeWebRTC` |
| `clientHints` | UA Client Hints | ~10 bits | `excludeClientHints` |
| `storage` | Storage availability | ~4 bits | `excludeStorage` |
| `battery` | Battery status | ~3 bits | `excludeBattery` |
| `connection` | Network info | ~4 bits | `excludeConnection` |
| `touch` | Touch capabilities | ~4 bits | `excludeTouch` |
| `permissions` | Permission states | ~5 bits | `excludePermissions` |
| `math` | Math precision | ~6 bits | `excludeMath` |
| `mediaDevices` | Cameras/mics count | ~5 bits | `excludeMediaDevices` |

## 🛡️ Bot Detection

Detects automation tools and suspicious environments:

```javascript
const result = await Fingerprint.generate({
  includeSuspectAnalysis: true
});

if (result.suspectAnalysis.riskLevel === "HIGH") {
  // Block or challenge
  console.log("Detected:", result.suspectAnalysis.signals);
}
```

### Detection Capabilities

- **Automation**: Puppeteer, Playwright, Selenium, PhantomJS
- **Headless**: HeadlessChrome, CDP artifacts
- **Inconsistencies**: UA/platform mismatch, hardware anomalies
- **Privacy Tools**: Canvas noise, property tampering
- **Known Bots**: Googlebot, Bingbot, crawlers

## 🔧 Advanced Usage

```javascript
import { Fingerprint, CanvasCollector, WebGLCollector } from "fingerprinter-js";

// Custom collector options
const fp = new Fingerprint({
  excludeWebRTC: true,      // Skip WebRTC
  excludeBattery: true,     // Skip Battery
  timeout: 3000,            // 3s timeout per collector
  customData: {
    userId: "12345",
    version: "1.0"
  }
});

const result = await fp.generate();

// Or use collectors individually
const canvas = new CanvasCollector();
const canvasData = canvas.collect();
```

## 📈 Confidence Levels

| Level | Score | Meaning |
|-------|-------|---------|
| High | 90-100% | Very reliable, most collectors successful |
| Medium | 70-89% | Reliable, some collectors unavailable |
| Low | 50-69% | Moderate reliability |
| Very Low | <50% | Few collectors, unstable |

## 📱 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- No Node.js support (browser-only)

## 🔄 Stability

FingerprintJS automatically filters unstable data:

```javascript
const fp = new Fingerprint({
  customData: {
    version: "1.0",           // ✅ Kept
    timestamp: Date.now(),    // ❌ Filtered
    sessionId: "uuid-here",   // ❌ Filtered
  }
});

// Use allowUnstableData: true to keep all data
```

## 📄 License

MIT © Lorenzo Coslado

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

## 📞 Support

- 🐛 [Issues](https://github.com/Lorenzo-Coslado/fingerprinter-js/issues)
- 💬 [Discussions](https://github.com/Lorenzo-Coslado/fingerprinter-js/discussions)
- 🌐 [Live Demo](https://lorenzo-coslado.github.io/fingerprinter-js)
