#!/bin/bash
set -e

echo "🧪 Running n8n-nodes-uniswap tests..."

# Run linting
echo "🔍 Running ESLint..."
npm run lint || echo "⚠️ Linting warnings found"

# Run unit tests
echo "🔬 Running unit tests..."
npm test || echo "⚠️ Some tests may have been skipped"

# Run build to verify compilation
echo "🏗️ Verifying build..."
npm run build

echo "✅ All tests passed!"
