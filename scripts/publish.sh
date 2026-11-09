#!/usr/bin/env sh
set -eu

# Validation only. Publishing happens from a versioned GitHub release via OIDC.
# Never modifies versions, credentials, registries or Git history.
npm run check
npm run release:check
printf '%s\n' 'Release checks passed. See docs/RELEASING.md for publication.'
