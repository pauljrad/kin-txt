#!/bin/bash
# Kinetext Build & Deploy Helper Script

echo "🏗️  Building Kinetext for production..."
cd ~/reading-app
npm run build

echo ""
echo "✅ Build complete!"
echo "📦 Your production files are in: ~/reading-app/dist/"
echo ""
echo "🚀 To deploy:"
echo "   1. Go to: https://app.netlify.com/drop"
echo "   2. Drag the 'dist' folder"
echo ""
echo "Opening dist folder..."
open ~/reading-app/dist/
