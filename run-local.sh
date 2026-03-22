#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-8080}"
echo "Starting local server at http://localhost:${PORT}"
echo "Press Ctrl+C to stop"
python3 -m http.server "${PORT}"
