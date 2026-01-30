# FingerprinterJS v2.0

🔐 **Enterprise-grade browser fingerprinting** with 19 collectors, advanced bot detection, and stable hashing.

[![npm version](https://img.shields.io/npm/v/fingerprinter-js)](https://www.npmjs.com/package/fingerprinter-js)
[![npm downloads](https://img.shields.io/npm/dt/fingerprinter-js)](https://www.npmjs.com/package/fingerprinter-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Live Demo](https://lorenzo-coslado.github.io/fingerprinter-js) • [NPM Package](https://www.npmjs.com/package/fingerprinter-js)

---

## ✨ Features

- **19 Collectors** - Comprehensive browser data collection
- **Stable Hashing** - Only stable data contributes to fingerprint hash
- **Bot Detection** - Detects Puppeteer, Playwright, Selenium, headless browsers
- **TypeScript** - Full type safety
- **Zero Dependencies** - Lightweight (~15KB gzipped)
- **Parallel Collection** - Fast data gathering

## 📦 Installation

```bash
npm install fingerprinter-js
```

## 🚀 Quick Start

```javascript
import { Fingerprint } from "fingerprinter-js";

const result = await Fingerprint.generate({
  includeSuspectAnalysis: true
});

console.log(result.fingerprint);  // "a1b2c3d4..."
console.log(result.confidence);   // 100
console.log(result.entropy);      // 85
console.log(result.suspectAnalysis?.riskLevel); // "LOW"
```

## 📊 Result Structure

```typescript
interface FingerprintResult {
  fingerprint: string;        // SHA-256 hash (stable collectors only)
  components: Record<string, unknown>; // All collected data
  confidence: number;         // 0-100%
  entropy: number;            // Bits of entropy
  duration: number;           // Generation time (ms)
  version: string;            // "2.0.0"
  suspectAnalysis?: {
    score: number;            // 0-100 (higher = more suspicious)
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    signals: SuspectSignal[];
  };
}
```

## 🎯 Collectors

### Stable Collectors (included in hash)

| Collector | Description | Entropy |
|-----------|-------------|---------|
| `userAgent` | Browser User-Agent | ~8 bits |
| `language` | Preferred languages | ~3 bits |
| `timezone` | Timezone offset & name | ~4 bits |
| `screen` | Resolution, color depth | ~6 bits |
| `plugins` | Installed plugins | ~5 bits |
| `canvas` | 2D canvas fingerprint | ~10 bits |
| `webgl` | GPU vendor & renderer | ~9 bits |
| `fonts` | Available system fonts | ~8 bits |
| `hardware` | CPU cores, memory, platform | ~5 bits |
| `clientHints` | UA Client Hints API | ~7 bits |
| `storage` | Storage API availability | ~4 bits |
| `touch` | Touch capabilities | ~4 bits |
| `math` | Math precision values | ~2 bits |
| `mediaDevices` | Cameras/mics count | ~5 bits |

### Unstable Collectors (data collected but NOT in hash)

| Collector | Description | Why Unstable |
|-----------|-------------|--------------|
| `webrtc` | Local IPs, SDP | IPs can change |
| `battery` | Battery level & charging | Values fluctuate |
| `connection` | Network type & speed | Variables change |
| `permissions` | Permission states | User can change |
| `audio` | Audio processing fingerprint | Varies on first run |

> ⚠️ Unstable collectors provide useful data for analysis but don't affect the fingerprint hash, ensuring consistent identification.

## 🛡️ Bot Detection

```javascript
const result = await Fingerprint.generate({
  includeSuspectAnalysis: true
});

if (result.suspectAnalysis?.riskLevel === "HIGH") {
  console.log("Bot detected:", result.suspectAnalysis.signals);
}
```

### Detection Capabilities

- **Automation Tools**: Puppeteer, Playwright, Selenium, PhantomJS
- **Headless Browsers**: HeadlessChrome, CDP artifacts
- **Inconsistencies**: UA/platform mismatch, hardware anomalies
- **Privacy Tools**: Canvas noise, property tampering
- **Known Bots**: Googlebot, Bingbot, crawlers

## 🔧 Configuration Options

```javascript
const result = await Fingerprint.generate({
  // Exclude specific collectors
  excludeCanvas: false,
  excludeWebGL: false,
  excludeAudio: false,
  excludeFonts: false,
  excludeWebRTC: false,
  excludeHardware: false,
  excludeClientHints: false,
  excludeStorage: false,
  excludeBattery: false,
  excludeConnection: false,
  excludeTouch: false,
  excludePermissions: false,
  excludeMath: false,
  excludeMediaDevices: false,
  
  // Bot detection
  includeSuspectAnalysis: true,
  
  // Custom data (optional)
  customData: {
    userId: "12345"
  },
  
  // Allow unstable custom data
  allowUnstableData: false,
  
  // Timeout per collector (ms)
  timeout: 5000
});
```

## 📱 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 12+ |
| Edge | 79+ |

> ⚠️ This library is browser-only. Node.js is not supported.

## 🔄 Stability Guarantee

The fingerprint hash is **stable across page reloads** because:

1. Only **stable collectors** contribute to the hash
2. Temporal values (timestamps, UUIDs) are automatically filtered from custom data
3. Unstable platform data (battery level, network speed) is collected but excluded from hash

```javascript
// This will produce the same hash every time
const result1 = await Fingerprint.generate();
const result2 = await Fingerprint.generate();
console.log(result1.fingerprint === result2.fingerprint); // true
```

## 🧩 Individual Collectors

```javascript
import { 
  CanvasCollector, 
  WebGLCollector,
  FontsCollector 
} from "fingerprinter-js";

// Use collectors individually
const canvas = new CanvasCollector();
const data = canvas.collect();
console.log(data);
```

## 📄 License

MIT © [Lorenzo Coslado](https://github.com/Lorenzo-Coslado)

## 🔗 Links

- [GitHub Repository](https://github.com/Lorenzo-Coslado/fingerprinter-js)
- [NPM Package](https://www.npmjs.com/package/fingerprinter-js)
- [Live Demo](https://lorenzo-coslado.github.io/fingerprinter-js)
