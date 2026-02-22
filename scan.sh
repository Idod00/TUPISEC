#!/bin/bash
# TupiSec - Quick scan wrapper
# Usage: ./scan.sh <URL> [output_name]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/venv/bin/activate"

URL="${1:?Usage: ./scan.sh <URL> [output_name]}"
NAME="${2:-$(echo "$URL" | sed 's|https\?://||;s|/|_|g;s|[^a-zA-Z0-9._-]||g')}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT="$SCRIPT_DIR/reports/${NAME}_${TIMESTAMP}.txt"

echo "TupiSec Scanner"
echo "Target: $URL"
echo "Output: $OUTPUT"
echo ""

python3 "$SCRIPT_DIR/scanner.py" "$URL" --output "$OUTPUT"

echo ""
echo "Done. Report at: $OUTPUT"
