# Security policy

The v3 line is the development and maintenance target. Until 3.0.0 is published, the npm `latest` version may still be v2; check the package version rather than assuming this branch has been released. Older major versions do not receive routine fixes once v3 is released. No paid support or response-time SLA is provided.

## Report a vulnerability

Use [GitHub's private vulnerability reporting](https://github.com/Lorenzo-Coslado/fingerprinter-js/security/advisories/new). Include affected versions, a minimal reproduction, impact and suggested mitigation when available. Avoid personal browser observations, credentials and public exploit reports while maintainers assess the issue.

This project is maintained on a best-effort basis. Maintainers will acknowledge, investigate and coordinate a fix when available; no fixed response time is promised. If the reporting channel is unavailable, contact the repository owner through their public GitHub profile without posting exploit details publicly.

## Trust boundaries

Fingerprint and automation outputs are supplied by a browser controlled by the visitor. They can be modified, omitted or replayed. They must not be used as authentication, authorization, a permanent device identity, or the sole basis for a fraud decision. The SHA-256 digest describes normalized observations; it does not authenticate those observations or guarantee their uniqueness.

Network collectors are opt-in. The default SDK does not transmit telemetry or persist a fingerprint. Review [collection effects and privacy](docs/PRIVACY.md) before deployment. Security fixes that change an identification input can affect fingerprints and will be documented in migration/release notes.
