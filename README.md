# FingerprintJS

A modern JavaScript library for generating unique and reliable browser fingerprints.

## 🚀 Features

- **Complete fingerprinting**: Uses multiple fingerprinting techniques (Canvas, WebGL, Audio, Fonts, etc.)
- **TypeScript**: Full support with included types
- **Modular**: Ability to exclude certain collectors
- **Compatible**: Works in all modern browsers
- **Lightweight**: Optimized bundle with no dependencies
- **Secure**: Uses SHA-256 for hashing when available
- **Smart Stability**: Automatically filters unstable data
- **Suspect Analysis**: Built-in bot and fraud detection

## 📦 Installation

```bash
npm install fingerprinter-js
```

## 🔧 Usage

### Basic Usage

```javascript
import Fingerprint from "fingerprinter-js";

// Simple generation
const result = await Fingerprint.generate();
console.log(result.fingerprint); // "a1b2c3d4e5f6..."
console.log(result.confidence); // 85
```

### Advanced Usage

```javascript
import { Fingerprint } from "fingerprinter-js";

// With custom options
const fingerprint = new Fingerprint({
  excludeCanvas: true,
  excludeWebGL: true,
  customData: {
    userId: "12345",
    sessionId: "abc-def-ghi", // ⚠️ Will be automatically filtered for stability
    version: "1.0", // ✅ Stable, will be kept
  },
});

// To include unstable data (not recommended)
const unstableFingerprint = new Fingerprint({
  allowUnstableData: true,
  customData: {
    timestamp: Date.now(), // ⚠️ Will make fingerprint unstable
    sessionId: "random-id",
  },
});

const result = await fingerprint.generate();
```

### With Suspect Analysis

```javascript
// Enable bot/fraud detection
const result = await Fingerprint.generate({
  includeSuspectAnalysis: true,
});

console.log(result.suspectAnalysis);
// {
//   score: 15,           // 0-100 (0=legitimate, 100=very suspicious)
//   riskLevel: 'LOW',    // LOW/MEDIUM/HIGH
//   signals: [...],      // Detected suspicious signals
//   details: {...}       // Analysis details
// }
```

### Available Options

```typescript
interface FingerprintOptions {
  excludeScreenResolution?: boolean;
  excludeTimezone?: boolean;
  excludeLanguage?: boolean;
  excludeCanvas?: boolean;
  excludeWebGL?: boolean;
  excludeAudio?: boolean;
  excludePlugins?: boolean;
  excludeFonts?: boolean;
  customData?: Record<string, any>;
  allowUnstableData?: boolean; // Allow temporal data (default: false)
  includeSuspectAnalysis?: boolean; // Include suspect analysis (default: false)
}
```

⚠️ **Automatic Stability**: By default, FingerprintJS automatically filters unstable data from `customData` (timestamps, UUIDs, random values) to ensure fingerprint stability. Use `allowUnstableData: true` if you need to include this data.

### Get Components Only

```javascript
const fingerprint = new Fingerprint();
const components = await fingerprint.getComponents();

console.log(components);
// {
//   userAgent: "Mozilla/5.0...",
//   language: ["en-US", "en"],
//   timezone: "America/New_York",
//   screen: { width: 1920, height: 1080, ... },
//   canvas: "data:image/png;base64,...",
//   webgl: { vendor: "Google Inc.", ... },
//   ...
// }
```

## 🎯 Available Collectors

| Collector   | Description                      | Exclusion Option          |
| ----------- | -------------------------------- | ------------------------- |
| `userAgent` | Browser User-Agent               | ❌ (always included)      |
| `language`  | Preferred languages              | `excludeLanguage`         |
| `timezone`  | Timezone                         | `excludeTimezone`         |
| `screen`    | Screen resolution and properties | `excludeScreenResolution` |
| `plugins`   | Installed plugins                | `excludePlugins`          |
| `canvas`    | Canvas 2D fingerprint            | `excludeCanvas`           |
| `webgl`     | WebGL information                | `excludeWebGL`            |
| `audio`     | Audio fingerprint                | `excludeAudio`            |
| `fonts`     | Available fonts                  | `excludeFonts`            |

## 📈 Confidence Level

The confidence level indicates fingerprint reliability:

- **90-100%**: Very reliable, many components available
- **70-89%**: Reliable, some components missing
- **50-69%**: Moderately reliable, several components unavailable
- **< 50%**: Low reliability, few components available

## 🕵️ Suspect Analysis

FingerprintJS includes advanced bot and fraud detection:

### Suspect Score (0-100)

- **0-30**: Legitimate user ✅
- **30-70**: Requires vigilance ⚠️
- **70-100**: Likely malicious 🚨

### Detection Capabilities

- **Automation Tools**: Selenium, PhantomJS, Puppeteer
- **Headless Browsers**: Chrome headless, etc.
- **Inconsistencies**: Timezone/language mismatches
- **Bot Signatures**: Known crawler patterns
- **Environmental Anomalies**: Missing APIs, suspicious user agents

### Example Usage

```javascript
const result = await Fingerprint.generate({
  includeSuspectAnalysis: true,
});

if (result.suspectAnalysis.score > 70) {
  // Block or challenge suspicious users
  console.log("Suspicious activity detected");
  console.log("Signals:", result.suspectAnalysis.signals);
} else if (result.suspectAnalysis.score > 30) {
  // Require additional authentication
  console.log("Moderate risk detected");
} else {
  // Allow normal access
  console.log("Legitimate user");
}
```

## 🛡️ Security Considerations

This library is designed for:

- Two-factor authentication
- Fraud detection
- Anonymous analytics
- Experience personalization

**Important**: Respect user privacy and local regulations (GDPR, etc.).

## 🔄 Fingerprint Stability

FingerprintJS automatically ensures fingerprint stability by filtering unstable data:

### ✅ Stable Data (kept)

- Static browser properties
- Stable custom data (version, configuration, etc.)
- Hardware characteristics

### ❌ Unstable Data (automatically filtered)

- `timestamp`, `time`, `now`, `date`
- `random`, `rand`, `nonce`, `salt`
- `sessionId`, `requestId`, `uuid`
- UUIDs and temporary identifiers
- Numbers that look like timestamps

### Automatic Filtering Example

```javascript
const fp = new Fingerprint({
  customData: {
    // ✅ Kept (stable)
    version: "1.0",
    theme: "dark",

    // ❌ Automatically filtered (unstable)
    timestamp: Date.now(),
    sessionId: "123e4567-e89b-12d3-a456-426614174000",
    random: Math.random(),
  },
});

// Result: only version and theme will be included
```

If you absolutely need to include unstable data:

```javascript
const fp = new Fingerprint({
  allowUnstableData: true, // ⚠️ Disables filtering
  customData: {
    timestamp: Date.now(), // Will make fingerprint unstable
  },
});
```

## 🔧 Custom Collectors Usage

```javascript
import { Fingerprint, CanvasCollector, WebGLCollector } from "fingerprinter-js";

// Use only specific collectors
const canvas = new CanvasCollector();
const canvasData = await canvas.collect();

const webgl = new WebGLCollector();
const webglData = await webgl.collect();
```

## 📱 Compatibility

- **Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Node.js**: Not supported (browser environment only)
- **TypeScript**: Full support

## 🤝 API Reference

### Fingerprint Class

#### `constructor(options?: FingerprintOptions)`

Creates a new Fingerprint instance.

#### `generate(): Promise<FingerprintResult>`

Generates a complete fingerprint.

#### `getComponents(): Promise<Record<string, any>>`

Gets components without generating hash.

### Static Methods

#### `Fingerprint.generate(options?: FingerprintOptions): Promise<FingerprintResult>`

Quickly generates a fingerprint with default options.

#### `Fingerprint.getAvailableCollectors(): string[]`

Returns the list of available collectors.

### Types

```typescript
interface FingerprintResult {
  fingerprint: string; // Fingerprint hash
  components: Record<string, any>; // Collected data
  confidence: number; // Confidence level (0-100)
  suspectAnalysis?: SuspectAnalysis; // Optional suspect analysis
}

interface SuspectAnalysis {
  score: number; // Suspect score (0-100)
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  signals: SuspectSignal[];
  details: Record<string, any>;
}
```

## 🚀 Use Cases

### Fraud Detection

```javascript
const result = await Fingerprint.generate({ includeSuspectAnalysis: true });
if (result.suspectAnalysis.score > 80) {
  // Block transaction
}
```

### Bot Protection

```javascript
const result = await Fingerprint.generate({ includeSuspectAnalysis: true });
const automationSignals = result.suspectAnalysis.signals.filter((s) =>
  ["webdriver", "headless", "selenium"].includes(s.type)
);
if (automationSignals.length > 0) {
  // Challenge with CAPTCHA
}
```

### Analytics Quality

```javascript
const result = await Fingerprint.generate({ includeSuspectAnalysis: true });
if (result.suspectAnalysis.score < 40) {
  // Include in analytics
  track("page_view", { fingerprint: result.fingerprint });
}
```

## 📄 License

MIT © Lorenzo Coslado

## 🤝 Contributing

Contributions are welcome! Please read the contributing guide before submitting a PR.

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/Lorenzo-Coslado/fingerprinter-js/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Lorenzo-Coslado/fingerprinter-js/discussions)
