# Interstitial Ad Flow Testing Guide

## Overview
This guide helps test the smart interstitial ad timing after routine completion to ensure ads don't overwhelm users.

## Current Flow Order
1. User completes routine → CompletedRoutine screen
2. Returns to HomeScreen → Mini-game popup may appear
3. If first routine → AI Wellness onboarding appears (blocks ad)
4. If NOT first routine AND completed 5+ routines → Interstitial ad appears after 3-second delay

## Test Scenarios

### Scenario 1: First Time User (AI Wellness Onboarding)
1. **Fresh Install Test**
   - Clear app data or fresh install
   - Complete first routine
   - Expected: Mini-game popup → Return to home → AI Wellness onboarding
   - **NO INTERSTITIAL AD** should show (even if 5+ routines somehow)

### Scenario 2: Regular User Under 5 Completions
1. **Complete 1-4 routines**
   - Complete any routine
   - Expected: Mini-game popup → Return to home
   - **NO INTERSTITIAL AD** should show

### Scenario 3: Regular User At 5 Completions (Ad Trigger)
1. **Complete 5th routine**
   - Complete your 5th routine
   - Expected flow:
     - CompletedRoutine screen
     - Mini-game popup (optional - can skip)
     - Return to HomeScreen
     - Wait 3 seconds
     - **INTERSTITIAL AD SHOWS**
   - Counter resets to 0 after ad

### Scenario 4: Premium User (No Ads)
1. **Premium user completes 5+ routines**
   - Expected: Normal flow but **NO ADS** ever

## Debug Logging
Check console for these key logs:

```
// When completing routine:
"CompletedRoutine: Notifying AdService of break completion"
"AdService: Break completed! Count: X/5"

// When returning to home:
"ROUTINE_COMPLETED event received in HomeScreen"
"HomeScreen: Checking if should show interstitial ad after routine..."

// If eligible for ad:
"AdService: Eligible for interstitial ad, will show after returning to home"
"HomeScreen: Eligible for interstitial, waiting 3 seconds..."
"HomeScreen: Showing delayed interstitial ad now"
"AdService: Showing delayed interstitial ad from home screen"

// If AI onboarding blocks ad:
"HomeScreen: First routine, AI onboarding will show, skipping ad"
```

## AdService Status Check
You can check ad status at any time with:
```javascript
AdService.getAdStatus()
```

Returns:
- `breaksCompleted`: Current count (0-5)
- `canShowInterstitial`: If cooldown passed
- `isPremium`: Premium status
- `lastInterstitialTime`: Last ad shown timestamp

## Testing Tips

1. **Speed up testing**: Temporarily change `BREAKS_BEFORE_INTERSTITIAL` in `adService.ts` from 5 to 2
2. **Check ad cooldown**: Default is 10 minutes between interstitials
3. **Test ads**: In dev mode, test ads should show (Google test ads)
4. **Production ads**: Real ads only show in production builds

## Common Issues

### Ad Not Showing After 5 Completions
- Check if user is premium
- Check if AI onboarding is interfering (first routine)
- Check if 10-minute cooldown is active
- Verify `breaksCompleted` count in AdService

### Ad Showing Too Early
- Should wait 3 seconds after returning to home
- Should NOT show during mini-game or AI onboarding

### Ad Counter Not Resetting
- Counter should reset to 0 after ad is shown
- Check AsyncStorage for `adBreaksCompleted` value

## Production Checklist
- [ ] Test with real ad IDs (not test ads)
- [ ] Verify 5 completion threshold
- [ ] Confirm 3-second delay works
- [ ] Test premium users see no ads
- [ ] Verify AI onboarding blocks ad on first routine
- [ ] Check 10-minute cooldown between ads