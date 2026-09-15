#!/usr/bin/env bash
#
# Batch import tours from an Excel (.xlsx) workbook.
#
# Entry point for the current-version, script-based importer. It runs the
# TypeScript worker (scripts/import-tours.ts) via tsx from the web/ directory
# so that .env.local and the generated Prisma client resolve correctly.
#
# Examples:
#   scripts/import-tours.sh path/to/tours.xlsx --list
#   scripts/import-tours.sh path/to/tours.xlsx --sheets "國旅,泰國" --dry-run
#   scripts/import-tours.sh path/to/tours.xlsx --sheets all
#   scripts/import-tours.sh path/to/tours.xlsx            # interactive sheet picker
#
# See scripts/import-tours.sh <file> --help for all options, and
# scripts/fixtures/README.md for the file format.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"

# Resolve a relative xlsx path against the caller's cwd before we cd into web/.
ARGS=()
for arg in "$@"; do
  case "$arg" in
    -* ) ARGS+=("$arg") ;;                       # option, pass through
    *  )
      if [[ -e "$arg" ]]; then
        ARGS+=("$(cd "$(dirname "$arg")" && pwd)/$(basename "$arg")")
      else
        ARGS+=("$arg")                           # let the worker report the error
      fi
      ;;
  esac
done

cd "$WEB_DIR"

if ! command -v unzip >/dev/null 2>&1; then
  echo "錯誤：找不到 unzip，請先安裝（解析 xlsx 需要）。" >&2
  exit 1
fi

exec npx tsx scripts/import-tours.ts "${ARGS[@]}"
