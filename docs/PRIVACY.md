# Data collection and privacy

FingerprinterJS executes in the browser on an explicit call to `generate()` or `getComponents()`. Importing it does not start collection. It does not send telemetry, require an account, or persist a visitor identifier. The default profiles make no network requests.

An environment fingerprint can support recognition and linking. Hashing the observations does not make them anonymous or establish a legal exemption. Choose a purpose and collection policy before integrating the SDK; trigger collection only when your application is authorized to do so. Notice, consent where required, access controls, retention and deletion are responsibilities of the integration.

## Collector effects

| Collectors                                            | Observations and effects                                                                                                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User agent, language, timezone, hardware, touch, math | Read browser-exposed configuration and capabilities. No remote requests.                                                                                                                                           |
| Screen, plugins, Client Hints                         | Read display/browser data; Client Hints can expose additional platform detail where available.                                                                                                                     |
| Canvas, WebGL                                         | Create temporary rendering surfaces and inspect rendering/capabilities. Browser privacy settings may restrict or alter results.                                                                                    |
| Fonts                                                 | Measure a temporary hidden element to inspect available fonts; clean it up when finished.                                                                                                                          |
| Storage                                               | Read capabilities and quota; test local/session storage with temporary keys that preserve application data. No persistent fingerprint is stored.                                                                   |
| Media devices                                         | Enumerate exposed device counts; do not request camera/microphone access or record media. Visibility, permissions and policy affect availability.                                                                  |
| Permissions                                           | Query exposed permission states; do not request new permission grants.                                                                                                                                             |
| Battery, connection                                   | Read optional battery/network status APIs. These observations are excluded from the fingerprint.                                                                                                                   |
| Audio                                                 | Process an offline audio signal where supported, without playing sound. Excluded from the fingerprint.                                                                                                             |
| WebRTC                                                | Disabled by default. An explicit network opt-in and explicit collector selection are required. Supplied ICE servers can receive traffic and expose candidate addresses; there is no hardcoded public STUN service. |
| Automation snapshot                                   | When analysis is requested, read explicit automation observations for deterministic replay; excluded from the fingerprint.                                                                                         |

The [API documentation](API.md) lists profile selection and stable projections. Unsupported, blocked, failed and timed-out observations are reported separately. They are not evidence of abuse. Protecting privacy is not itself a bot signal.

## Minimize what you collect and retain

Use the smallest suitable profile and an explicit collector list when you need stricter control. `customData` is application context outside the hash. `fingerprintData` explicitly contributes to identification; do not insert personal information unless your integration requires and permits it. It does not become anonymous by being hashed.

Raw `components` can be more sensitive than the final fingerprint. Keep them local when possible. The demo exports a diagnostic summary with statuses and timing rather than the underlying observations or fingerprint. Reducing an exported payload does not reduce what was already collected: configure collectors first.

Avoid treating a browser signature as an authentication factor, a permanent device identifier, a cross-site user ID, or the sole reason to block an account or transaction. Browser data can change, collide or be forged; automated clients can omit the SDK entirely.

## Integration references

The [CNIL guidance](https://cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi) includes fingerprinting among tracking techniques and explains that consent and exemptions depend on purpose and necessity. An authentication-security use does not automatically exempt analytics or other secondary uses. The [W3C Privacy Working Group guidance](https://www.w3.org/TR/fingerprinting-guidance/) recommends minimization and graceful degradation. These sources are design and integration references, not a compliance certification of this package.
