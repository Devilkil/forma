#!/bin/bash
echo "=========================================="
echo "   Building Forma for macOS (arm64/x64)   "
echo "=========================================="
cd "$(dirname "$0")"
echo "Installing dependencies..."
npm install
echo "Building macOS DMG installer..."
npm run dist:mac
echo "Done! Check the release/ folder for Forma-0.1.0-arm64.dmg"
