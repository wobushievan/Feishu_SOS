#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "========================================"
echo "Traffic Fine Deduction Runner (macOS)"
echo "Working directory: $SCRIPT_DIR"
echo "========================================"
echo

if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
else
  echo "Python is not installed. Please install Python 3 first."
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

echo "Using: $PYTHON_CMD"
echo

"$PYTHON_CMD" traffic_fine_deduction.py
EXIT_CODE=$?

echo
if [ $EXIT_CODE -eq 0 ]; then
  echo "Done. Please check the generated Excel output in this folder."
else
  echo "Run failed with exit code $EXIT_CODE."
fi

echo
read -r -p "Press Enter to close..."
exit $EXIT_CODE
