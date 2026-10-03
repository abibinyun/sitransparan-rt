#!/usr/bin/env bash
set -e

# Resolve repository root and docs directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_DIR="${SCRIPT_DIR}/docs"

if [ ! -d "${DOCS_DIR}" ]; then
  echo "Error: Directory docs/ not found in ${SCRIPT_DIR}"
  exit 1
fi

echo "🚀 Opening SiTransparan RT/RW Obsidian Vault at: ${DOCS_DIR}"

# Check execution method: flatpak, native binary, snap, or URI
if flatpak list | grep -q "md.obsidian.Obsidian"; then
  echo "Opening via Flatpak..."
  flatpak run md.obsidian.Obsidian "obsidian://open?path=${DOCS_DIR}" >/dev/null 2>&1 &
elif command -v obsidian >/dev/null 2>&1; then
  echo "Opening via native obsidian..."
  obsidian "obsidian://open?path=${DOCS_DIR}" >/dev/null 2>&1 &
elif command -v snap >/dev/null 2>&1 && snap list obsidian >/dev/null 2>&1; then
  echo "Opening via Snap..."
  snap run obsidian "obsidian://open?path=${DOCS_DIR}" >/dev/null 2>&1 &
else
  echo "Obsidian executable not found. Opening via default system handler (xdg-open)..."
  xdg-open "obsidian://open?path=${DOCS_DIR}" >/dev/null 2>&1 &
fi

echo "✅ Obsidian launched successfully."
