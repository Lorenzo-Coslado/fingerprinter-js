# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Open-source developers, from individuals to larger engineering teams, who need browser signals and want to understand the behavior and limits of a browser fingerprinting library.

## Product Purpose

FingerprinterJS collects explicitly requested browser observations and derives a versioned fingerprint from a defined projection. The repository playground lets developers generate an observation, inspect collector states, compare consecutive runs, and execute checks against the local SDK build.

## Operating Context

The package is distributed through npm. The interactive page lives in `docs/` for GitHub Pages and runs locally through the repository's demo scripts. The playground imports its own generated SDK files rather than a remote CDN. It is a developer tool, not a hosted identity service.

## Capabilities and Constraints

- Collection profiles, individual collector selection, deadlines, cancellation, and structured collector results.
- Context data stays separate from explicitly selected fingerprint data.
- Collection starts on an explicit action; the playground stores results in page memory.
- Network collectors are disabled by default. The playground configures no STUN or TURN servers.
- Exported playground diagnostics omit the fingerprint and raw observations.
- A fingerprint is contextual evidence, not an authentication credential, a unique personal identity, or a calibrated fraud decision.
- No measured uniqueness, long-term stability, or bot-detection accuracy claim is established by the playground checks.

## Brand Commitments

Keep the existing FingerprinterJS name. The requested demonstration should be very simple and clean; this implementation interprets the user's “ChatCN” reference as a restrained shadcn-style developer interface. Product copy is in English for the open-source audience.

## Evidence on Hand

The repository includes a historical audit of v2, an executable SDK, automated tests, and local browser checks. These are technical evidence, not a population study or customer endorsement.

## Product Principles

- Make collection, availability, and uncertainty inspectable.
- Keep the common integration short and the advanced controls explicit.
- Separate observations, identification inputs, and interpretation.
- Explain limitations beside the result they qualify.
- Avoid a required external service or account for evaluating the package.
