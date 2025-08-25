# Google AdMob Setup Guide for FlexBreak

## Overview
This guide explains how to set up Google AdMob for the FlexBreak app to display ads and generate revenue.

## Current Implementation

### Ad Types Implemented:
1. **Banner Ads** - Bottom of HomeScreen
2. **Interstitial Ads** - Shown after:
   - Every 5 completed breaks
   - Every 3rd time opening Settings
   - Every 2nd time opening Achievements
3. **Rewarded Ads** - Watch ad to unlock daily motivational quote

### Premium Integration
- All ads are automatically hidden for premium subscribers
- "Remove Ads" prompt shown with banner ads to encourage upgrades
- Premium users get instant access to daily quotes without ads

## Setup Steps

### 1. Create AdMob Account
1. Go to [AdMob](https://admob.google.com/)
2. Sign up or sign in with your Google account
3. Create a new app for iOS and Android

### 2. Create Ad Units
For each platform (iOS and Android), create:
- 1 Banner Ad Unit
- 1 Interstitial Ad Unit  
- 1 Rewarded Ad Unit

### 3. Update Ad Unit IDs

Replace the test IDs in `/src/services/adService.ts` with your actual AdMob Unit IDs:

```typescript
private adUnitIds = {
  banner: __DEV__ 
    ? TestIds.BANNER 
    : Platform.select({
        ios: 'ca-app-pub-YOUR_ID/YOUR_BANNER_ID',
        android: 'ca-app-pub-YOUR_ID/YOUR_BANNER_ID',
      }),
  
  interstitial: __DEV__
    ? TestIds.INTERSTITIAL
    : Platform.select({
        ios: 'ca-app-pub-YOUR_ID/YOUR_INTERSTITIAL_ID',
        android: 'ca-app-pub-YOUR_ID/YOUR_INTERSTITIAL_ID',
      }),
  
  rewarded: __DEV__
    ? TestIds.REWARDED
    : Platform.select({
        ios: 'ca-app-pub-YOUR_ID/YOUR_REWARDED_ID',
        android: 'ca-app-pub-YOUR_ID/YOUR_REWARDED_ID',
      }),
};
```

### 4. Update App Configuration

Update `app.json` with your AdMob App IDs:

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-XXXXXXXXXXXXX~XXXXXXXXXXXX",
    "iosAppId": "ca-app-pub-XXXXXXXXXXXXX~XXXXXXXXXXXX"
  }
]
```

### 5. iOS Setup (Additional)

Add to your `Info.plist`:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXX~XXXXXXXXXXXX</string>
<key>SKAdNetworkItems</key>
<array>
  <!-- Add Google's SKAdNetwork identifiers -->
</array>
```

### 6. Android Setup (Additional)

Add to your `AndroidManifest.xml`:
```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-XXXXXXXXXXXXX~XXXXXXXXXXXX"/>
```

## Testing

### Test Mode
The app automatically uses test ads in development mode (`__DEV__`). This prevents invalid clicks during development.

### Test Devices
To test with real ads on specific devices, add test device IDs in AdMob console.

## Ad Frequency & User Experience

Current settings (configurable in `adService.ts`):
- **Interstitial Cooldown**: 10 minutes between ads
- **Breaks Before Ad**: Show after 5 completed breaks
- **Settings Frequency**: Show every 3rd visit
- **Achievements Frequency**: Show every 2nd visit

## Revenue Optimization Tips

1. **Monitor Performance**: Check AdMob dashboard regularly
2. **A/B Testing**: Test different ad frequencies
3. **User Feedback**: Monitor reviews for ad-related complaints
4. **Premium Conversion**: Track how many users upgrade to remove ads

## Troubleshooting

### Ads Not Showing
1. Check if test mode is disabled for production
2. Verify Ad Unit IDs are correct
3. Ensure AdMob account is approved
4. Check if ads are enabled in your region

### Build Issues
1. Run `npx expo prebuild --clean` after setup
2. Ensure all native dependencies are properly linked
3. Check for conflicting plugins in `app.json`

## Privacy & Compliance

1. Update Privacy Policy to mention ad usage
2. Implement GDPR consent if targeting EU users
3. Follow AdMob policies for content and placement

## Support

For AdMob issues: https://support.google.com/admob
For implementation issues: Check the FlexBreak repository issues