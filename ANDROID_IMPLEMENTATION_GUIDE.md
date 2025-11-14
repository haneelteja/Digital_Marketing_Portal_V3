# Android App Implementation Guide - Step by Step

## Quick Start (30 minutes)

### Step 1: Install Prerequisites

```bash
# 1. Install Android Studio
# Download from: https://developer.android.com/studio
# Install with default settings

# 2. Install Java JDK 17 or 21
# Android Studio includes JDK, or download separately

# 3. Set Environment Variables (Windows)
# Add to System Environment Variables:
# ANDROID_HOME = C:\Users\<YourUser>\AppData\Local\Android\Sdk
# Add to PATH:
# %ANDROID_HOME%\platform-tools
# %ANDROID_HOME%\tools
# %ANDROID_HOME%\tools\bin
```

### Step 2: Install Capacitor

```bash
# In your project directory
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npm install @capacitor/app @capacitor/haptics @capacitor/keyboard
npm install @capacitor/status-bar @capacitor/splash-screen
npm install @capacitor/filesystem @capacitor/camera
npm install @capacitor/network @capacitor/preferences
npm install @capacitor/toast @capacitor/share
```

### Step 3: Initialize Capacitor

```bash
# Initialize Capacitor
npx cap init "Digital Marketing Portal" "com.digitalmarketing.portal"

# Add Android platform
npx cap add android
```

### Step 4: Configure Capacitor

**Create/Update `capacitor.config.ts`:**
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.digitalmarketing.portal',
  appName: 'Digital Marketing Portal',
  webDir: '.next',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366f1',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
```

### Step 5: Build and Sync

```bash
# Build Next.js app
npm run build

# Sync with Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

### Step 6: Run on Device/Emulator

**In Android Studio:**
1. Connect Android device or start emulator
2. Click "Run" button (green play icon)
3. App will install and launch

---

## Detailed Implementation

### Part 1: Project Structure Setup

#### 1.1 Update package.json

Add these scripts:
```json
{
  "scripts": {
    "android:dev": "next dev & npx cap run android",
    "android:build": "next build && npx cap sync android",
    "android:open": "npx cap open android",
    "android:sync": "npx cap sync android"
  }
}
```

#### 1.2 Create Capacitor Service

**Create `src/lib/capacitor.ts`:**
```typescript
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { Toast } from '@capacitor/toast';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

export async function initNativeFeatures() {
  if (isNative) {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      await SplashScreen.hide();
      
      // Network monitoring
      Network.addListener('networkStatusChange', (status) => {
        if (!status.connected) {
          Toast.show({
            text: 'No internet connection',
            duration: 'long'
          });
        }
      });
      
      // Back button handling
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });
    } catch (error) {
      console.error('Error initializing native features:', error);
    }
  }
}

export async function showToast(message: string) {
  if (isNative) {
    await Toast.show({
      text: message,
      duration: 'short'
    });
  } else {
    console.log(message);
  }
}
```

#### 1.3 Update Root Layout

**Modify `src/app/layout.tsx`:**
```typescript
'use client';

import { useEffect } from 'react';
import { initNativeFeatures } from '../lib/capacitor';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initNativeFeatures();
  }, []);

  // ... rest of existing layout code
}
```

---

### Part 2: Android Configuration

#### 2.1 AndroidManifest.xml

**Location**: `android/app/src/main/AndroidManifest.xml`

**Key Settings:**
- Minimum SDK: 24 (Android 7.0)
- Target SDK: 34 (Android 14)
- Permissions for camera, storage, network

#### 2.2 Build.gradle

**Location**: `android/app/build.gradle`

**Key Settings:**
- `minSdkVersion 24`
- `targetSdkVersion 34`
- `versionCode` and `versionName`

#### 2.3 App Icons

**Generate Icons:**
1. Go to: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload your logo (1024x1024px recommended)
3. Generate icons
4. Download and extract to `android/app/src/main/res/`

---

### Part 3: Code Adaptations

#### 3.1 Update File Uploads

**For Camera Access:**
```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNative } from '../lib/capacitor';

export async function selectImage() {
  if (isNative) {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });
    return image.dataUrl;
  } else {
    // Fallback to file input for web
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });
  }
}
```

#### 3.2 Network Status Handling

**Update API Client:**
```typescript
import { Network } from '@capacitor/network';
import { isNative } from '../lib/capacitor';

export async function checkConnection() {
  if (isNative) {
    const status = await Network.getStatus();
    return status.connected;
  }
  return navigator.onLine;
}
```

---

### Part 4: Building the App

#### 4.1 Debug Build

```bash
# 1. Build Next.js
npm run build

# 2. Sync with Android
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. In Android Studio:
#    - Connect device or start emulator
#    - Click Run (green play button)
```

#### 4.2 Release Build

**Create Keystore:**
```bash
keytool -genkey -v -keystore digital-marketing-portal.keystore -alias portal -keyalg RSA -keysize 2048 -validity 10000
```

**Configure Signing in Android Studio:**
1. File > Project Structure > Modules > app
2. Signing Configs tab
3. Add release config with keystore details

**Build Release APK:**
1. Build > Generate Signed Bundle / APK
2. Select "APK" or "Android App Bundle"
3. Choose release keystore
4. Build

---

### Part 5: Testing

#### 5.1 Emulator Testing

**Create Emulator:**
1. Android Studio > Tools > Device Manager
2. Create Virtual Device
3. Select device (e.g., Pixel 5)
4. Select system image (API 33+)
5. Finish

**Run on Emulator:**
- Click Run in Android Studio
- Select emulator from device list

#### 5.2 Physical Device Testing

**Enable Developer Options:**
1. Settings > About Phone
2. Tap "Build Number" 7 times
3. Go back > Developer Options
4. Enable "USB Debugging"

**Connect Device:**
1. Connect via USB
2. Allow USB debugging on device
3. Verify in Android Studio device list
4. Run app

---

### Part 6: Distribution

#### 6.1 Google Play Store

**Requirements:**
- Google Play Developer account ($25)
- App signing key
- Privacy policy URL
- Store listing assets

**Steps:**
1. Create Play Console account
2. Create new app
3. Upload AAB file
4. Complete store listing
5. Submit for review

#### 6.2 Direct APK Distribution

**For Internal Use:**
1. Build release APK
2. Host on secure server
3. Provide download link
4. Users enable "Install from unknown sources"

---

## Troubleshooting

### Common Issues

**Issue: "SDK location not found"**
```bash
# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Library/Android/sdk  # Mac
set ANDROID_HOME=C:\Users\<User>\AppData\Local\Android\Sdk  # Windows
```

**Issue: "Gradle sync failed"**
- Update Gradle in Android Studio
- File > Invalidate Caches / Restart

**Issue: "App crashes on launch"**
- Check Android logs: `adb logcat`
- Verify Supabase URLs are correct
- Check network permissions

**Issue: "Build fails"**
- Clean project: Build > Clean Project
- Rebuild: Build > Rebuild Project
- Check Java version compatibility

---

## Next Steps After Implementation

1. **Test thoroughly** on multiple devices
2. **Optimize performance** (bundle size, load times)
3. **Add analytics** (Firebase Analytics)
4. **Set up crash reporting** (Firebase Crashlytics)
5. **Prepare store listing** materials
6. **Submit to Play Store**

---

**Ready to start? Run the Quick Start commands above!** 🚀




