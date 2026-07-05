#!/usr/bin/env bash
# Wrapper for accounting E2E verification (purge + full business flow test)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python "$SCRIPT_DIR/accounting_e2e_verify.py" "$@"
