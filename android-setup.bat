@echo off
REM Android Setup Script for Digital Marketing Portal (Windows)
REM Run this script to set up Android development environment

echo 🚀 Setting up Android development environment...

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check Java
where java >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Java not found. Android Studio includes JDK, or install separately.
) else (
    echo ✅ Java found
    java -version
)

REM Install Capacitor
echo 📦 Installing Capacitor...
call npm install @capacitor/core @capacitor/cli
call npm install @capacitor/android

REM Install Capacitor plugins
echo 📦 Installing Capacitor plugins...
call npm install @capacitor/app @capacitor/haptics @capacitor/keyboard
call npm install @capacitor/status-bar @capacitor/splash-screen
call npm install @capacitor/filesystem @capacitor/camera
call npm install @capacitor/network @capacitor/preferences
call npm install @capacitor/toast @capacitor/share

REM Initialize Capacitor
echo 🔧 Initializing Capacitor...
call npx cap init "Digital Marketing Portal" "com.digitalmarketing.portal" --web-dir=".next"

REM Add Android platform
echo 📱 Adding Android platform...
call npx cap add android

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Install Android Studio from https://developer.android.com/studio
echo 2. Set ANDROID_HOME environment variable to: C:\Users\%USERNAME%\AppData\Local\Android\Sdk
echo 3. Add to PATH: %%ANDROID_HOME%%\platform-tools
echo 4. Run: npm run build
echo 5. Run: npx cap sync android
echo 6. Run: npx cap open android

pause




