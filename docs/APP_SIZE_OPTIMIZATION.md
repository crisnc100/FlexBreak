# FlexBreak App Size Optimization Guide

## Current Issue
App size is 850MB, which is extremely large for a React Native app. Target: <100MB.

## Optimization Steps

### 1. **Enable Android App Bundle (AAB) - MOST IMPORTANT**
✅ Already configured in `eas.json`:
```json
"android": {
  "buildType": "app-bundle"
}
```
This alone can reduce download size by 50-70% as Google Play will serve only the required architecture.

### 2. **Enable ProGuard/R8 Minification**
✅ Already added to `app.json`:
```json
"enableProguardInReleaseBuilds": true,
"enableShrinkResourcesInReleaseBuilds": true
```

### 3. **Build Commands for Optimized APK**
For production builds:
```bash
# For App Bundle (recommended for Play Store)
npx eas-cli build --platform android --profile production

# For APK with single architecture (for testing size)
npx eas-cli build --platform android --profile production --local
```

### 4. **Additional Optimizations**

#### a. Split APKs by Architecture (if using APK)
Add to `android/app/build.gradle`:
```gradle
android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a'
            universalApk false
        }
    }
}
```

#### b. Remove Unused Permissions
Check `android/app/src/main/AndroidManifest.xml` and remove any unused permissions.

#### c. Optimize Images
- Convert PNG to WebP where possible
- Use appropriate image sizes (don't use 4K images for small icons)
- Consider using vector drawables for simple graphics

### 5. **Expected Size Reduction**
- Current: 850MB (universal APK with all architectures)
- With App Bundle: ~80-120MB per architecture
- With ProGuard: Additional 10-20% reduction
- Final expected size: **60-100MB** per device

### 6. **iOS Optimizations**
For iOS, the build system already optimizes well, but ensure:
- Build configuration is set to "Release"
- Bitcode is enabled (default in Expo)
- App thinning is enabled (automatic with App Store)

### 7. **Check What's Taking Space**
After building locally, you can analyze the APK:
```bash
# For Android
cd android/app/build/outputs/apk/release/
unzip -l app-release.apk | sort -k1 -n | tail -20

# Check method count
dexcount app-release.apk
```

### 8. **Common Culprits**
- **Multiple architectures**: Universal APK includes arm, arm64, x86, x86_64
- **Debug symbols**: Not stripped in debug builds
- **Unused dependencies**: Check and remove from package.json
- **Large assets**: Already checked - assets are minimal (<1MB)

## Build Command for Optimized Size
```bash
# Production build with all optimizations
npx eas-cli build --platform android --profile production --clear-cache

# iOS build (already optimized)
npx eas-cli build --platform ios --profile production --clear-cache
```

## Verification
After building, the APK/AAB size should be:
- AAB file: ~40-60MB
- Per-architecture APK: ~60-100MB
- iOS IPA: ~80-120MB

The 850MB was likely a universal debug APK. Production builds with these optimizations will be much smaller! 