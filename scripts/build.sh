#!/usr/bin/env bash
# Assemble a self-contained static package in dist/ and zip it.
# Three.js is downloaded at the pinned version and the import map in the
# dist copy of index.html is rewritten to point at the local copy, so the
# package runs on any static host with no CDN dependency.
set -euo pipefail
cd "$(dirname "$0")/.."

THREE_VERSION=$(sed -n 's|.*three@\([0-9.]*\)/build/three.module.js.*|\1|p' index.html)
THREE_CDN="https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build"

rm -rf dist drift-away-dist.zip
mkdir -p dist/vendor
cp style.css dist/
cp -R js dist/js
curl -sSfL -o dist/vendor/three.module.js "${THREE_CDN}/three.module.js"
curl -sSfL -o dist/vendor/three.core.js "${THREE_CDN}/three.core.js"
sed "s|${THREE_CDN}/three.module.js|./vendor/three.module.js|" index.html > dist/index.html
grep -q './vendor/three.module.js' dist/index.html

(cd dist && zip -qr ../drift-away-dist.zip .)
echo "built dist/ (three@${THREE_VERSION} vendored) and drift-away-dist.zip"
