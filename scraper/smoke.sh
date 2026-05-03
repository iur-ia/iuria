#!/usr/bin/env bash
# Convenience wrapper to run the judicial scraper smoke tests.
# Usage:
#   ./scraper/smoke.sh              # all tribunals
#   ./scraper/smoke.sh TJSP STJ    # specific tribunals
#   ./scraper/smoke.sh --datajud   # DataJud-only (fast, no browser required)
#   ./scraper/smoke.sh --json      # machine-readable JSON output
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 scraper/test_smoke.py "$@"
