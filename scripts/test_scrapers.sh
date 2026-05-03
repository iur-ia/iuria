#!/usr/bin/env bash
# Executa o smoke-test suite dos scrapers judiciais.
# test_smoke.py é um script CLI (argparse), não um módulo pytest — executar direto.
#
# Usage:
#   ./scripts/test_scrapers.sh              (todos os tribunais)
#   ./scripts/test_scrapers.sh TJSP STJ    (tribunais específicos)
#   ./scripts/test_scrapers.sh --datajud   (apenas DataJud, mais rápido)
#
# Nota: package.json não pode ser editado neste projeto, então use este
# script diretamente em vez de npm run test:scrapers.

set -euo pipefail

cd "$(dirname "$0")/.."

PYTHON="${PYTHON:-python3}"
SMOKE="scraper/test_smoke.py"

echo "=== Smoke tests — scrapers judiciais ==="
echo "Python: $($PYTHON --version 2>&1)"
echo "Script: $SMOKE"
echo ""

exec $PYTHON "$SMOKE" "$@"
