# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-01

### Added

- Initial release of Fingerprinter.js
- Complete browser fingerprinting with multiple collectors:
  - UserAgent collector (always included)
  - Language collector
  - Timezone collector
  - Screen resolution collector
  - Plugins collector
  - Canvas 2D fingerprinting
  - WebGL fingerprinting
  - Audio fingerprinting
  - Font detection
- TypeScript support with full type definitions
- Confidence scoring system (0-100%)
- Automatic data stability with unstable data filtering
- Suspect analysis and bot detection with scoring (0-100)
- Multiple output formats: CommonJS, ESM, UMD
- SHA-256 hashing with mathematical fallback
- Comprehensive test suite with Jest
- Cross-browser compatibility (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)

### Features

- **Smart Stability**: Automatically filters temporal data (timestamps, UUIDs, random values)
- **Suspect Analysis**: Advanced bot and fraud detection with configurable analysis
- **Modular Design**: Ability to exclude specific collectors
- **Custom Data**: Support for custom data with automatic stability filtering
- **High Performance**: Optimized bundle with no external dependencies
- **Browser APIs**: Comprehensive coverage of browser fingerprinting techniques

### Security

- Automatic filtering of unstable data to prevent fingerprint instability
- Built-in bot detection for automation tools (Selenium, PhantomJS, etc.)
- Headless browser detection
- Inconsistency analysis for timezone/language mismatches
- Known bot signature detection

### Documentation

- Complete API documentation
- Usage examples for common scenarios
- TypeScript type definitions
- Contributing guidelines
- Security considerations and GDPR compliance notes

### Technical Details

- Built with TypeScript 5.2.2
- Bundled with Rollup 3.29.2
- Tested with Jest 29.7.0
- Linted with ESLint 8.49.0
- Compatible with modern browsers and build tools

[1.0.0]: https://github.com/Lorenzo-Coslado/fingerprinter-js/releases/tag/v1.0.0
