# First-Time User Flow: Notifications & Weather

## When User First Opens FlexBreak

### Step 1: Home Screen - Enable Reminders
When user toggles "Enable Reminders" ON:

1. **System Notification Permission Request**
   ```
   FlexBreak Would Like to Send You Notifications
   Notifications may include alerts, sounds, and icon badges.
   [Don't Allow] [Allow]
   ```

2. **If User Taps "Allow"**:
   - ✅ Notifications are scheduled
   - ✅ Success alert: "Reminders Enabled"
   - ⏱️ After 1 second delay...

### Step 2: Smart Weather Permission Prompt
Automatically appears after enabling notifications:

```
🌤️ Enhance Your Notifications
Would you like weather-based wellness reminders? 
FlexBreak can tailor messages based on your 
local weather conditions.

[Not Now] [Enable Weather]
```

### Step 3A: If User Taps "Enable Weather"
1. **System Location Permission Request**
   ```
   Allow "FlexBreak" to use your location?
   Your location is used to provide weather-based
   wellness reminders.
   
   [Don't Allow] [Allow While Using App]
   ```

2. **If User Allows Location**:
   - ✅ Weather notifications enabled
   - ✅ Location fetched (city, coordinates)
   - ✅ Weather data cached
   - ✅ Future notifications will mix weather + motivational

### Step 3B: If User Taps "Not Now"
- ✅ Regular motivational notifications only
- ❌ No weather messages
- 💡 Can enable later in Settings > AI Wellness

## Complete First-Time Flow Example

```
User Journey:
1. Opens app → Sees reminder toggle
2. Turns on reminders → iOS/Android asks for notifications
3. Allows notifications → "Reminders Enabled" message
4. Sees weather prompt → "Would you like weather-based reminders?"
5. Taps "Enable Weather" → iOS/Android asks for location
6. Allows location → Weather features activated

Result: User gets intelligent mix of weather + wellness notifications
```

## What Happens Behind the Scenes

### When Weather is Enabled:
```typescript
// Every time notifications are scheduled:
1. Check if weather enabled → YES
2. Get user location → Cary, NC
3. Fetch weather data → 87°F, Cloudy
4. For each notification:
   - Roll probability dice
   - 20% chance: Show weather message
   - 80% chance: Show motivational message
```

### Example Notification Schedule (Your Weather):
- Mon 9:15 AM: "💼 Neck tension building?" (motivational)
- Mon 2:30 PM: "Movement break!" (motivational)
- Tue 10:00 AM: "☁️ 87°F outside - Great day for movement!" (weather)
- Tue 3:15 PM: "Posture check!" (motivational)
- Wed 9:45 AM: "Quick break time" (motivational)

## Settings Control

Users can always control this in Settings:
- **AI Wellness** > **Weather-Based Notifications** toggle
- Turn ON/OFF anytime
- If OFF: Only motivational messages
- If ON: Smart mix based on conditions

## Privacy & Permissions

- **Notifications**: Required for any reminders
- **Location**: Optional, only for weather
- **No tracking**: Location only used for weather API
- **Local storage**: Weather cached for 3 hours

## Edge Cases Handled

1. **Already has location permission**: 
   - Skip location request
   - Just ask "Enable weather notifications?"

2. **Denies location after saying yes**:
   - Show error: "Please check location permissions"
   - Weather stays disabled

3. **Disables location in iOS settings**:
   - Weather messages stop
   - Falls back to motivational only

4. **Re-enables notifications**:
   - Weather prompt only shows if not already asked