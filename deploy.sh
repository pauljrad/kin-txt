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
echo "   1. npx vercel --prod"
echo "   2. Follow the prompts (use existing project 'kin-txt')"
echo ""
echo "✅ Done!"
