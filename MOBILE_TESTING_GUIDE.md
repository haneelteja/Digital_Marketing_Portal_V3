# Mobile Testing Guide - Digital Marketing Portal

## Quick Start Methods

### Method 1: Local Network Testing (Recommended for Development)

#### Step 1: Find Your Computer's IP Address

**Windows:**
```powershell
# Open PowerShell and run:
ipconfig

# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

**Mac/Linux:**
```bash
ifconfig | grep "inet "
# or
ip addr show
```

#### Step 2: Start Dev Server on Network Interface

**Windows PowerShell:**
```powershell
# Start Next.js dev server accessible on network
$env:HOST="0.0.0.0"; npm run dev
```

**Mac/Linux:**
```bash
# Start Next.js dev server accessible on network
HOST=0.0.0.0 npm run dev
```

Or modify `package.json`:
```json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0"
  }
}
```

#### Step 3: Access from Mobile Device

1. Ensure your mobile device is on the **same Wi-Fi network** as your computer
2. Open mobile browser (Chrome, Safari, etc.)
3. Navigate to: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`

#### Step 4: Allow Firewall Access (Windows)

If connection fails, allow Node.js through Windows Firewall:

```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "Node.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

### Method 2: Browser Dev Tools Mobile Emulation

#### Chrome DevTools

1. Open Chrome on your computer
2. Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
3. Click the **Device Toolbar** icon (or press `Ctrl+Shift+M`)
4. Select a device preset or set custom dimensions
5. Test touch interactions, viewport sizes, etc.

**Available Device Presets:**
- iPhone 12/13/14 Pro
- iPhone SE
- Samsung Galaxy S20/S21
- iPad Pro
- Pixel 5
- Custom dimensions

#### Firefox DevTools

1. Press `F12` to open DevTools
2. Click **Responsive Design Mode** (or press `Ctrl+Shift+M`)
3. Select device or set custom size

---

### Method 3: Using ngrok (For External Testing)

#### Install ngrok

**Windows:**
```powershell
# Download from https://ngrok.com/download
# Or use Chocolatey:
choco install ngrok

# Or use npm:
npm install -g ngrok
```

**Mac:**
```bash
brew install ngrok
```

#### Start ngrok Tunnel

1. Start your Next.js dev server:
   ```bash
   npm run dev
   ```

2. In a new terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Access from any device (mobile, tablet, etc.) using the ngrok URL

**Note:** Free ngrok URLs expire after 2 hours. For permanent URLs, upgrade to a paid plan.

---

### Method 4: Deploy to Staging Environment

#### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Deploy to preview/staging
4. Access from mobile using the Vercel URL

**Advantages:**
- Permanent URL
- HTTPS enabled
- Accessible from anywhere
- Real production-like environment

---

## Mobile Testing Checklist

### ✅ Basic Functionality

- [ ] **Login/Authentication**
  - Test login form on mobile
  - Verify password visibility toggle
  - Test "Remember me" functionality
  - Check session persistence

- [ ] **Navigation**
  - Test sidebar menu (hamburger menu on mobile)
  - Verify all navigation links work
  - Test back button behavior
  - Check deep linking

- [ ] **Dashboard**
  - Verify calendar displays correctly
  - Test calendar navigation (swipe, tap)
  - Check client cards display
  - Verify pie chart renders

### ✅ Forms & Inputs

- [ ] **Form Inputs**
  - Test all input fields (text, number, date, select)
  - Verify keyboard types (numeric, email, etc.)
  - Check input zoom behavior (should not zoom on iOS)
  - Test form validation messages

- [ ] **Date Pickers**
  - Test calendar date selection
  - Verify date format display
  - Check date range selection

- [ ] **File Uploads**
  - Test image upload
  - Test video upload
  - Verify file size limits
  - Check upload progress indicators

### ✅ Touch Interactions

- [ ] **Touch Targets**
  - All buttons should be at least 44x44px
  - Verify tap targets are not too close
  - Test double-tap zoom (should be disabled where needed)

- [ ] **Gestures**
  - Swipe on calendar
  - Pinch to zoom (on images)
  - Long press (if applicable)
  - Pull to refresh (if implemented)

- [ ] **Scrolling**
  - Test vertical scrolling
  - Test horizontal scrolling (tables)
  - Verify smooth scrolling
  - Check scroll indicators

### ✅ Responsive Layout

- [ ] **Viewport Sizes**
  - Test on small phones (320px - 375px)
  - Test on large phones (375px - 414px)
  - Test on tablets (768px - 1024px)
  - Test in portrait and landscape

- [ ] **Layout Elements**
  - Sidebar collapses on mobile
  - Tables scroll horizontally
  - Modals are full-screen on mobile
  - Cards stack vertically

- [ ] **Typography**
  - Text is readable (minimum 16px)
  - Headings scale appropriately
  - Line height is comfortable
  - Text doesn't overflow

### ✅ Performance

- [ ] **Loading Times**
  - Initial page load < 3 seconds
  - Navigation between pages < 1 second
  - Image loading is optimized
  - Lazy loading works

- [ ] **Network Conditions**
  - Test on 3G/4G connection
  - Test on slow Wi-Fi
  - Verify offline behavior
  - Check error handling for network failures

### ✅ Specific Features

- [ ] **Social Media Campaigns**
  - Create campaign form
  - View campaigns list
  - Upload campaign content
  - Approve/disapprove posts
  - Add comments

- [ ] **Art Works**
  - Create artwork form
  - View artworks list
  - Upload artwork content
  - Preview images/videos
  - Zoom and pan images

- [ ] **Calendar**
  - Add calendar entry
  - View entries by date
  - Filter by client
  - Export to Excel

- [ ] **Reports**
  - Generate reports
  - Filter reports
  - Export reports
  - View charts

### ✅ Browser Compatibility

Test on:
- [ ] Chrome (Android)
- [ ] Safari (iOS)
- [ ] Firefox Mobile
- [ ] Samsung Internet
- [ ] Edge Mobile

### ✅ Device-Specific Testing

- [ ] **iOS Devices**
  - iPhone SE (small screen)
  - iPhone 12/13/14 (standard)
  - iPhone 14 Pro Max (large screen)
  - iPad (tablet)

- [ ] **Android Devices**
  - Small phone (320px width)
  - Standard phone (360-375px)
  - Large phone (414px+)
  - Tablet (7-10 inches)

---

## Common Mobile Issues & Solutions

### Issue 1: Input Zoom on iOS

**Problem:** iOS Safari zooms in when focusing on input fields < 16px

**Solution:** Already implemented with `input-mobile` class:
```css
font-size: 16px; /* Prevents zoom */
```

### Issue 2: Touch Target Too Small

**Problem:** Buttons are hard to tap

**Solution:** Already implemented with `touch-target` class:
```css
min-height: 44px;
min-width: 44px;
```

### Issue 3: Sidebar Not Closing

**Problem:** Mobile sidebar doesn't close when clicking outside

**Solution:** Check if `onClick` handlers are properly implemented

### Issue 4: Modal Not Full Screen

**Problem:** Modals don't use full screen on mobile

**Solution:** Already implemented with `modal-mobile` class

### Issue 5: Horizontal Scroll Issues

**Problem:** Content overflows horizontally

**Solution:** Tables use `table-mobile-container` with horizontal scroll

---

## Testing Tools

### Browser DevTools

1. **Chrome DevTools**
   - Device emulation
   - Network throttling
   - Touch emulation
   - Sensor simulation

2. **Safari Web Inspector** (Mac only)
   - Connect iOS device via USB
   - Real device debugging
   - Network inspection

### Online Testing Tools

1. **BrowserStack** (https://www.browserstack.com)
   - Real device testing
   - Multiple browsers
   - Screenshot testing

2. **LambdaTest** (https://www.lambdatest.com)
   - Cross-browser testing
   - Real device cloud
   - Automated testing

3. **Responsively App** (https://responsively.app)
   - Free desktop app
   - Multiple viewports side-by-side
   - Device presets

---

## Quick Test Script

### Test on Your Phone Right Now

1. **Find your IP:**
   ```powershell
   ipconfig | findstr IPv4
   ```

2. **Start server on network:**
   ```powershell
   $env:HOST="0.0.0.0"; npm run dev
   ```

3. **On your phone:**
   - Connect to same Wi-Fi
   - Open browser
   - Go to: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`

4. **Test these quickly:**
   - ✅ Login
   - ✅ Open sidebar menu
   - ✅ Navigate to different tabs
   - ✅ Create a calendar entry
   - ✅ View campaigns
   - ✅ Upload an image

---

## Mobile-Specific Features Already Implemented

✅ **Responsive Sidebar** - Collapses to hamburger menu on mobile  
✅ **Touch-Friendly Buttons** - Minimum 44x44px touch targets  
✅ **Mobile Inputs** - Prevents iOS zoom, proper keyboard types  
✅ **Bottom-Sheet Modals** - Full-screen modals on mobile  
✅ **Horizontal Scroll Tables** - Tables scroll horizontally on small screens  
✅ **Safe Area Insets** - Handles device notches  
✅ **Responsive Typography** - Text scales appropriately  
✅ **Touch Gestures** - Swipe, pinch, pan support  

---

## Troubleshooting

### Can't Connect from Mobile

1. **Check Firewall:**
   ```powershell
   # Windows - Allow port 3000
   New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

2. **Check Network:**
   - Ensure phone and computer on same Wi-Fi
   - Disable VPN if active
   - Check router firewall settings

3. **Check Server:**
   - Verify server is running
   - Check if listening on `0.0.0.0:3000`
   - Try accessing from computer: `http://localhost:3000`

### Slow Performance on Mobile

1. **Enable Production Build:**
   ```bash
   npm run build
   npm start
   ```

2. **Check Network:**
   - Use Wi-Fi instead of mobile data
   - Check network speed

3. **Clear Cache:**
   - Clear browser cache on mobile
   - Hard refresh: `Ctrl+Shift+R` (or equivalent)

---

## Best Practices

1. **Test Early and Often** - Don't wait until the end
2. **Test on Real Devices** - Emulators are good, but real devices are better
3. **Test Different Networks** - 3G, 4G, Wi-Fi
4. **Test Different Orientations** - Portrait and landscape
5. **Test Different Screen Sizes** - Small to large devices
6. **Test Touch Interactions** - Not just clicks
7. **Test Performance** - Mobile networks are slower
8. **Test Offline Behavior** - What happens without internet?

---

## Need Help?

If you encounter issues:
1. Check browser console on mobile (use remote debugging)
2. Check server logs
3. Verify network connectivity
4. Test in incognito/private mode
5. Clear browser cache

---

**Happy Testing! 📱**




