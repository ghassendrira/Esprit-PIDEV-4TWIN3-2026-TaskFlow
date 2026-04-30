#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Remove Python bytecode caches generated during local runs.
find "$ROOT_DIR" -type d -name '__pycache__' -prune -exec rm -rf {} +
find "$ROOT_DIR" -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete

echo "Python caches cleaned"
