#!/bin/bash
# Android Setup Script for Digital Marketing Portal
# Run this script to set up Android development environment

echo "🚀 Setting up Android development environment..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check Java
if ! command -v java &> /dev/null; then
    echo "⚠️  Java not found. Android Studio includes JDK, or install separately."
else
    echo "✅ Java found: $(java -version 2>&1 | head -n 1)"
fi

# Install Capacitor
echo "📦 Installing Capacitor..."
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android

# Install Capacitor plugins
echo "📦 Installing Capacitor plugins..."
npm install @capacitor/app @capacitor/haptics @capacitor/keyboard
npm install @capacitor/status-bar @capacitor/splash-screen
npm install @capacitor/filesystem @capacitor/camera
npm install @capacitor/network @capacitor/preferences
npm install @capacitor/toast @capacitor/share

# Initialize Capacitor
echo "🔧 Initializing Capacitor..."
npx cap init "Digital Marketing Portal" "com.digitalmarketing.portal" --web-dir=".next"

# Add Android platform
echo "📱 Adding Android platform..."
npx cap add android

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Install Android Studio from https://developer.android.com/studio"
echo "2. Set ANDROID_HOME environment variable"
echo "3. Run: npm run build"
echo "4. Run: npx cap sync android"
echo "5. Run: npx cap open android"




