#!/usr/bin/env bash
set -euo pipefail
SHA="$(git rev-parse HEAD)"
export SOURCE_SHA="$SHA"
export ARTIFACT_DIR="${ARTIFACT_DIR:-/opt/cursor/artifacts}"
npm run build
npm run test:browser -- tests/browser/qa-screenshots.spec.js
echo "manifest: $ARTIFACT_DIR/SOURCE_SHA_MANIFEST-$SHA.txt"