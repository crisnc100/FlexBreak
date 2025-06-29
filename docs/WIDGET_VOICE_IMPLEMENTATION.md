# FlexBreak AI Wellness Widget, Rich Notifications & Voice Assistant Implementation Guide

## Overview
This document outlines the step-by-step implementation plan for adding rich notifications, home screen widgets, and voice assistant integration to the FlexBreak AI Wellness Coach feature.

## Table of Contents
1. [Technical Requirements](#technical-requirements)
2. [Architecture Overview](#architecture-overview)
3. [Phase 0: Rich Notifications (Widget-Style)](#phase-0-rich-notifications-widget-style)
4. [Phase 1: Data Sharing Foundation](#phase-1-data-sharing-foundation)
5. [Phase 2: iOS Widget Implementation](#phase-2-ios-widget-implementation)
6. [Phase 3: Android Widget Implementation](#phase-3-android-widget-implementation)
7. [Phase 4: Siri Shortcuts Integration](#phase-4-siri-shortcuts-integration)
8. [Phase 5: Google Assistant Integration](#phase-5-google-assistant-integration)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)

## Technical Requirements

### Prerequisites
- Expo SDK 49+ (with development build)
- React Native 0.72+
- iOS 14+ (for WidgetKit)
- Android 5.0+ (API 21+)
- Xcode 14+
- Android Studio

### Key Technologies
- **iOS**: WidgetKit, App Groups, Siri Shortcuts API
- **Android**: App Widgets, App Actions
- **Shared Data**: React Native MMKV or SharedPreferences/UserDefaults
- **Voice**: SiriKit, Google Assistant SDK

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │            AI Wellness Service                   │   │
│  │  - User data (name, language, preferences)      │   │
│  │  - Last check-in time                           │   │
│  │  - Wellness patterns                            │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                     │
│  ┌─────────────────┴───────────────────────────────┐   │
│  │           Widget Data Service                    │   │
│  │  - Sync data to native storage                  │   │
│  │  - Handle widget updates                        │   │
│  │  - Manage voice commands                        │   │
│  └─────────────────┬───────────────────────────────┘   │
└────────────────────┼─────────────────────────────────────┘
                     │
     ┌───────────────┴───────────────┐
     │                               │
┌────┴──────┐              ┌─────────┴──────┐
│   iOS     │              │    Android     │
│  Widget   │              │    Widget      │
│  ┌─────┐  │              │   ┌──────┐    │
│  │Widget│ │              │   │Widget│    │
│  │ Kit  │ │              │   │ XML  │    │
│  └─────┘  │              │   └──────┘    │
│  ┌─────┐  │              │   ┌──────┐    │
│  │Siri │  │              │   │Google│    │
│  └─────┘  │              │   │Assist│    │
└───────────┘              │   └──────┘    │
                           └────────────────┘
```

## Phase 0: Rich Notifications (Widget-Style)

### Overview
Rich notifications provide an immediate widget-like experience without requiring home screen widgets. They appear as expanded, interactive notifications with custom UI.

### Step 0.1: iOS Rich Notifications Setup

#### Create Notification Service Extension
1. In Xcode: File > New > Target > Notification Service Extension
2. Name: "FlexBreakNotificationService"
3. Language: Swift

#### Create `NotificationService.swift`:
```swift
import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?
    
    override func didReceive(_ request: UNNotificationRequest, 
                           withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
        
        if let bestAttemptContent = bestAttemptContent {
            // Modify the notification content here
            if request.content.categoryIdentifier == "AI_WELLNESS_SIMPLE" {
                // Add custom attachments for rich display
                addWellnessAttachments(to: bestAttemptContent)
            }
            
            contentHandler(bestAttemptContent)
        }
    }
    
    func addWellnessAttachments(to content: UNMutableNotificationContent) {
        // Add coach avatar image
        if let imageURL = Bundle.main.url(forResource: "ai-coach-avatar", withExtension: "png"),
           let attachment = try? UNNotificationAttachment(identifier: "avatar", 
                                                         url: imageURL, 
                                                         options: nil) {
            content.attachments = [attachment]
        }
    }
}
```

#### Create Notification Content Extension
1. File > New > Target > Notification Content Extension
2. Name: "FlexBreakNotificationContent"
3. Update `Info.plist`:
```xml
<key>UNNotificationExtensionCategory</key>
<array>
    <string>AI_WELLNESS_SIMPLE</string>
</array>
<key>UNNotificationExtensionInitialContentSizeRatio</key>
<real>0.5</real>
```

#### Create Custom UI in `MainInterface.storyboard`:
- Add avatar image view
- Add message label with custom styling
- Add quick action buttons (Chat, Voice, Dismiss)
- Add progress indicator for streaks

### Step 0.2: Android Rich Notifications Setup

#### Create Custom Notification Layout
Create `android/app/src/main/res/layout/notification_wellness_expanded.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="@drawable/notification_background">
    
    <!-- Header -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">
        
        <ImageView
            android:id="@+id/coach_avatar"
            android:layout_width="40dp"
            android:layout_height="40dp"
            android:src="@drawable/ai_coach_avatar"
            android:layout_marginEnd="12dp" />
        
        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">
            
            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="AI Flex Coach"
                android:textStyle="bold"
                android:textSize="16sp" />
                
            <TextView
                android:id="@+id/notification_time"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Daily check-in"
                android:textSize="12sp"
                android:textColor="@color/text_secondary" />
        </LinearLayout>
        
        <TextView
            android:id="@+id/streak_indicator"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="🔥 5"
            android:textSize="14sp" />
    </LinearLayout>
    
    <!-- Message -->
    <TextView
        android:id="@+id/notification_message"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:text="Time for your wellness check-in!"
        android:textSize="15sp"
        android:lineSpacingMultiplier="1.2" />
    
    <!-- Quick Actions -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="16dp"
        android:orientation="horizontal"
        android:gravity="end">
        
        <Button
            android:id="@+id/action_voice"
            android:layout_width="wrap_content"
            android:layout_height="36dp"
            android:layout_marginEnd="8dp"
            android:text="Voice"
            android:drawableStart="@drawable/ic_mic"
            style="@style/Widget.AppCompat.Button.Borderless.Colored" />
            
        <Button
            android:id="@+id/action_chat"
            android:layout_width="wrap_content"
            android:layout_height="36dp"
            android:text="Chat"
            android:drawableStart="@drawable/ic_chat"
            style="@style/Widget.AppCompat.Button.Colored" />
    </LinearLayout>
</LinearLayout>
```

#### Update Notification Service
Modify `/src/services/notifications/notificationService.ts`:
```typescript
import { Platform } from 'react-native';

export const scheduleRichNotification = async ({
  title,
  body,
  data,
  trigger
}: NotificationInput): Promise<string> => {
  if (Platform.OS === 'android') {
    // Use custom layout for Android
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          useCustomLayout: true,
          layoutName: 'notification_wellness_expanded'
        },
        // Android-specific styling
        color: '#4CAF50',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sound: true,
      },
      trigger,
    });
  } else {
    // iOS uses the extension automatically
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        categoryIdentifier: 'AI_WELLNESS_SIMPLE',
        sound: true,
      },
      trigger,
    });
  }
};
```

### Step 0.3: Quick Action Handlers

#### iOS Quick Actions
Update `ios/FlexBreakNotificationContent/NotificationViewController.swift`:
```swift
@IBAction func chatTapped(_ sender: UIButton) {
    // Open app with chat intent
    extensionContext?.performNotificationDefaultAction()
}

@IBAction func voiceTapped(_ sender: UIButton) {
    // Open app with voice recording intent
    let response = UNNotificationResponse(
        coder: NSCoder(),
        identifier: "VOICE_REPLY",
        userInfo: ["mode": "voice"]
    )
    extensionContext?.performNotificationDefaultAction()
}
```

#### Android Quick Actions
Update `android/app/src/main/java/com/flexbreak/notifications/NotificationActionReceiver.java`:
```java
public class NotificationActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if ("com.flexbreak.ACTION_VOICE".equals(action)) {
            // Launch app with voice mode
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.putExtra("mode", "voice");
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launchIntent);
        } else if ("com.flexbreak.ACTION_CHAT".equals(action)) {
            // Launch app with chat mode
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.putExtra("mode", "chat");
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launchIntent);
        }
        
        // Dismiss notification
        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(intent.getIntExtra("notificationId", 0));
    }
}
```

### Step 0.4: Testing Rich Notifications

1. **iOS Testing**:
   - Build with Xcode including extensions
   - Test on physical device (extensions don't work in simulator)
   - Verify custom UI appears when notification is expanded
   - Test quick actions open app correctly

2. **Android Testing**:
   - Build with custom notification layouts
   - Test on various Android versions (5.0+)
   - Verify expanded/collapsed states
   - Test action buttons and intents

## Phase 1: Data Sharing Foundation

### Step 1.1: Install Required Dependencies
```bash
# For Expo managed workflow, we need to eject or use development builds
expo install expo-dev-client

# For data sharing between app and widgets
npm install react-native-mmkv
npm install react-native-shared-group-preferences # iOS
```

### Step 1.2: Create Widget Data Service
Create `/src/services/widgetDataService.ts`:

```typescript
interface WidgetData {
  userName: string;
  language: 'en' | 'es' | 'zh';
  lastCheckIn: number;
  nextCheckInTime?: string;
  currentWellnessStatus?: string;
  isPremium: boolean;
}

class WidgetDataService {
  // Sync data to native storage accessible by widgets
  async updateWidgetData(data: Partial<WidgetData>): Promise<void> {
    // Implementation details in Phase 1.3
  }
  
  // Get data for widget display
  async getWidgetData(): Promise<WidgetData> {
    // Implementation details in Phase 1.3
  }
}
```

### Step 1.3: Configure App Groups (iOS)
1. In Xcode, add App Groups capability to main app target
2. Create app group: `group.com.flexbreak.wellness`
3. Add same app group to widget extension target (created later)

### Step 1.4: Configure Shared Preferences (Android)
1. Use `MODE_MULTI_PROCESS` for SharedPreferences
2. Create content provider for widget data access

## Phase 2: iOS Widget Implementation

### Step 2.1: Create Widget Extension
1. In Xcode: File > New > Target > Widget Extension
2. Name: "FlexBreakWidget"
3. Include Configuration Intent for customization

### Step 2.2: Widget Timeline Provider
Create `ios/FlexBreakWidget/Provider.swift`:

```swift
struct Provider: IntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), widgetData: WidgetData.placeholder())
    }
    
    func getSnapshot(for configuration: ConfigurationIntent, 
                     in context: Context, 
                     completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), 
                               widgetData: WidgetData.current())
        completion(entry)
    }
    
    func getTimeline(for configuration: ConfigurationIntent, 
                     in context: Context, 
                     completion: @escaping (Timeline<Entry>) -> ()) {
        // Update widget every hour
        var entries: [SimpleEntry] = []
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(
                byAdding: .hour, 
                value: hourOffset, 
                to: currentDate
            )!
            let entry = SimpleEntry(
                date: entryDate, 
                widgetData: WidgetData.current()
            )
            entries.append(entry)
        }
        
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}
```

### Step 2.3: Widget View
Create `ios/FlexBreakWidget/WidgetView.swift`:

```swift
struct FlexBreakWidgetView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .systemMedium:
            MediumWidgetView(widgetData: entry.widgetData)
        default:
            Text("Not Supported")
        }
    }
}

struct MediumWidgetView: View {
    let widgetData: WidgetData
    
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(greeting)
                    .font(.headline)
                Text("Ready for your wellness check-in?")
                    .font(.subheadline)
                Text("Last: \(lastCheckIn)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            VStack {
                Image(systemName: "figure.walk")
                    .font(.largeTitle)
                Text("🔥 5")
                    .font(.caption)
            }
        }
        .padding()
        .widgetURL(URL(string: "flexbreak://wellness/chat"))
    }
}
```

### Step 2.4: Deep Link Handling
Update `App.tsx` to handle widget deep links:

```typescript
const linking = {
  prefixes: ['flexbreak://'],
  config: {
    screens: {
      Wellness: {
        screens: {
          Chat: 'wellness/chat',
          Voice: 'wellness/voice',
        },
      },
    },
  },
};
```

## Phase 3: Android Widget Implementation

### Step 3.1: Create Widget Provider
Create `android/app/src/main/java/com/flexbreak/widget/FlexBreakWidgetProvider.java`:

```java
public class FlexBreakWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, 
                        int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
    
    static void updateAppWidget(Context context, 
                               AppWidgetManager appWidgetManager,
                               int appWidgetId) {
        // Get widget data from SharedPreferences
        SharedPreferences prefs = context.getSharedPreferences(
            "FlexBreakWidget", 
            Context.MODE_PRIVATE
        );
        
        String userName = prefs.getString("userName", "");
        long lastCheckIn = prefs.getLong("lastCheckIn", 0);
        
        // Create widget views
        RemoteViews views = new RemoteViews(
            context.getPackageName(), 
            R.layout.flexbreak_widget
        );
        
        // Update text
        views.setTextViewText(R.id.greeting_text, 
            "Hi " + userName + "! Ready for your wellness check-in?");
        
        // Set click intents
        Intent chatIntent = new Intent(context, MainActivity.class);
        chatIntent.setAction("WELLNESS_CHAT");
        PendingIntent chatPending = PendingIntent.getActivity(
            context, 0, chatIntent, PendingIntent.FLAG_UPDATE_CURRENT
        );
        views.setOnClickPendingIntent(R.id.chat_button, chatPending);
        
        Intent voiceIntent = new Intent(context, MainActivity.class);
        voiceIntent.setAction("WELLNESS_VOICE");
        PendingIntent voicePending = PendingIntent.getActivity(
            context, 1, voiceIntent, PendingIntent.FLAG_UPDATE_CURRENT
        );
        views.setOnClickPendingIntent(R.id.voice_button, voicePending);
        
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
```

### Step 3.2: Widget Layout
Create `android/app/src/main/res/layout/flexbreak_widget.xml`:

```xml
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="@drawable/widget_background">
    
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal">
        
        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">
            
            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="AI Flex Coach"
                android:textSize="16sp"
                android:textStyle="bold" />
                
            <TextView
                android:id="@+id/last_checkin_text"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Last check-in: 2 hours ago"
                android:textSize="12sp"
                android:textColor="@color/secondary_text" />
        </LinearLayout>
        
        <ImageView
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:src="@drawable/ic_robot" />
    </LinearLayout>
    
    <TextView
        android:id="@+id/greeting_text"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="16dp"
        android:text="Ready for your wellness check-in?"
        android:textSize="15sp" />
    
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="16dp"
        android:orientation="horizontal">
        
        <Button
            android:id="@+id/chat_button"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginEnd="8dp"
            android:text="Chat"
            android:drawableLeft="@drawable/ic_chat" />
            
        <Button
            android:id="@+id/voice_button"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="8dp"
            android:text="Voice"
            android:drawableLeft="@drawable/ic_mic" />
    </LinearLayout>
</LinearLayout>
```

### Step 3.3: Register Widget
Update `android/app/src/main/AndroidManifest.xml`:

```xml
<receiver android:name=".widget.FlexBreakWidgetProvider">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/flexbreak_widget_info" />
</receiver>
```

## Phase 4: Siri Shortcuts Integration

### Overview
Siri integration allows users to interact with Flex Coach using voice commands like "Hey Siri, check in with Flex Coach" or "Hey Siri, my back hurts".

### Step 4.1: Add Siri Capability
1. In Xcode, add Siri capability to app
2. Create Intent Definition file
3. Define custom intents:
   - `StartWellnessCheckIntent`
   - `ReportWellnessIntent` (with parameters: feelingType)

### Step 4.2: Intent Handler
Create `ios/IntentHandler.swift`:

```swift
class IntentHandler: INExtension {
    override func handler(for intent: INIntent) -> Any {
        switch intent {
        case is StartWellnessCheckIntent:
            return StartWellnessCheckIntentHandler()
        case is ReportWellnessIntent:
            return ReportWellnessIntentHandler()
        default:
            return self
        }
    }
}

class StartWellnessCheckIntentHandler: NSObject, StartWellnessCheckIntentHandling {
    func handle(intent: StartWellnessCheckIntent, 
                completion: @escaping (StartWellnessCheckIntentResponse) -> Void) {
        // Open app to wellness chat
        let response = StartWellnessCheckIntentResponse(
            code: .continueInApp, 
            userActivity: nil
        )
        completion(response)
    }
}
```

### Step 4.3: Implement Voice Response Handler
Create `ios/FlexBreakIntents/ReportWellnessIntentHandler.swift`:

```swift
class ReportWellnessIntentHandler: NSObject, ReportWellnessIntentHandling {
    func handle(intent: ReportWellnessIntent, 
                completion: @escaping (ReportWellnessIntentResponse) -> Void) {
        
        guard let feelingType = intent.feelingType else {
            completion(ReportWellnessIntentResponse(code: .failure, userActivity: nil))
            return
        }
        
        // Map Siri input to wellness categories
        let userInput: String
        switch feelingType {
        case .backPain:
            userInput = "My back hurts"
        case .stressed:
            userInput = "I'm feeling stressed"
        case .tired:
            userInput = "I'm tired"
        case .good:
            userInput = "I'm feeling good"
        default:
            userInput = feelingType.rawValue
        }
        
        // Send to AI Wellness Service via App Group
        if let sharedDefaults = UserDefaults(suiteName: "group.com.flexbreak.wellness") {
            sharedDefaults.set(userInput, forKey: "pendingSiriInput")
            sharedDefaults.set(Date().timeIntervalSince1970, forKey: "siriRequestTime")
            
            // Get quick response from stored patterns
            let quickResponse = getQuickResponse(for: feelingType)
            
            let response = ReportWellnessIntentResponse.success(response: quickResponse)
            completion(response)
        }
    }
    
    func getQuickResponse(for feelingType: FeelingType) -> String {
        switch feelingType {
        case .backPain:
            return "I'll help with that. Try standing up and doing gentle back stretches. Opening FlexBreak for more exercises."
        case .stressed:
            return "Let's tackle that stress. Take 5 deep breaths with me. Opening FlexBreak for a guided session."
        case .tired:
            return "Time for an energy boost. Stand up and do some arm circles. Opening FlexBreak for more tips."
        case .good:
            return "That's wonderful! Let's keep that momentum going. Opening FlexBreak for a quick wellness activity."
        default:
            return "I'm here to help. Opening FlexBreak for your wellness check-in."
        }
    }
}
```

### Step 4.4: Configure Siri Phrases
Update `ios/FlexBreak/Info.plist`:

```xml
<key>NSUserActivityTypes</key>
<array>
    <string>com.flexbreak.wellness.check</string>
    <string>com.flexbreak.wellness.report</string>
    <string>com.flexbreak.wellness.voice</string>
</array>
```

### Step 4.5: Donate Shortcuts in React Native
Create `/src/services/siriService.ts`:

```typescript
import { NativeModules, Platform } from 'react-native';

const { SiriShortcuts } = NativeModules;

export const siriService = {
  // Donate shortcut after successful wellness check
  donateWellnessCheckShortcut: async (userName: string) => {
    if (Platform.OS !== 'ios' || !SiriShortcuts) return;
    
    const phrases = [
      `Check in with Flex Coach`,
      `Start my wellness check`,
      `${userName}'s wellness check`,
      `How am I doing`
    ];
    
    await SiriShortcuts.donateShortcut({
      activityType: 'com.flexbreak.wellness.check',
      title: 'Wellness Check-in',
      suggestedInvocationPhrase: phrases[0],
      userInfo: {
        action: 'wellness_check',
        userName
      },
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
    });
  },
  
  // Donate specific condition shortcuts
  donateConditionShortcut: async (condition: 'back_pain' | 'stress' | 'tired') => {
    if (Platform.OS !== 'ios' || !SiriShortcuts) return;
    
    const shortcuts = {
      back_pain: {
        phrase: 'My back hurts',
        title: 'Report Back Pain',
        action: 'report_back_pain'
      },
      stress: {
        phrase: "I'm stressed",
        title: 'Report Stress',
        action: 'report_stress'
      },
      tired: {
        phrase: "I'm tired",
        title: 'Report Fatigue',
        action: 'report_tired'
      }
    };
    
    const shortcut = shortcuts[condition];
    
    await SiriShortcuts.donateShortcut({
      activityType: 'com.flexbreak.wellness.report',
      title: shortcut.title,
      suggestedInvocationPhrase: shortcut.phrase,
      userInfo: {
        action: shortcut.action,
        condition
      },
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
    });
  },
  
  // Handle Siri response in app
  handleSiriInput: async () => {
    if (Platform.OS !== 'ios') return null;
    
    const sharedDefaults = await NativeModules.SharedGroupPreferences;
    const pendingInput = await sharedDefaults.getItem('pendingSiriInput', 'group.com.flexbreak.wellness');
    
    if (pendingInput) {
      // Clear the pending input
      await sharedDefaults.setItem('pendingSiriInput', null, 'group.com.flexbreak.wellness');
      return pendingInput;
    }
    
    return null;
  }
};
```

### Step 4.6: Integrate with AI Wellness Service
Update `/src/components/wellness/WellnessBubble.tsx`:

```typescript
import { siriService } from '../../services/siriService';

useEffect(() => {
  // Check for Siri input when app becomes active
  const checkSiriInput = async () => {
    const siriInput = await siriService.handleSiriInput();
    if (siriInput) {
      // Process with AI
      const result = await aiWellnessService.processWellnessCheckIn(
        siriInput,
        userId
      );
      
      // Show response in bubble
      setLastResponse(result);
      setShowBubble(true);
    }
  };
  
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      checkSiriInput();
    }
  });
  
  return () => subscription.remove();
}, []);
```

## Phase 5: Google Assistant Integration

### Overview
Google Assistant integration enables commands like "OK Google, talk to Flex Coach" or "OK Google, I need help with back pain".

### Step 5.1: App Actions Configuration
Create `android/app/src/main/res/xml/actions.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<actions>
    <action intentName="actions.intent.OPEN_APP_FEATURE">
        <fulfillment urlTemplate="flexbreak://wellness/{feature}">
            <parameter-mapping 
                intentParameter="feature" 
                urlParameter="feature" />
        </fulfillment>
        <parameter name="feature">
            <entity-set-reference entitySetId="FeatureEntitySet" />
        </parameter>
    </action>
    
    <entity-set entitySetId="FeatureEntitySet">
        <entity identifier="WELLNESS_CHECK" name="wellness check" />
        <entity identifier="STRESS_RELIEF" name="stress relief" />
        <entity identifier="BACK_PAIN" name="back pain relief" />
    </entity-set>
</actions>
```

### Step 5.2: Create Built-in Intents
Update `android/app/src/main/res/xml/actions.xml` with health & fitness intents:

```xml
<?xml version="1.0" encoding="utf-8"?>
<actions>
    <!-- Health & Fitness Built-in Intent -->
    <action intentName="actions.intent.START_EXERCISE">
        <fulfillment urlTemplate="flexbreak://wellness/exercise?type={exerciseType}">
            <parameter-mapping 
                intentParameter="exercise.name" 
                urlParameter="exerciseType" />
        </fulfillment>
    </action>
    
    <!-- Get Health Observation Intent -->
    <action intentName="actions.intent.GET_HEALTH_OBSERVATION">
        <fulfillment urlTemplate="flexbreak://wellness/check?type={observationType}">
            <parameter-mapping 
                intentParameter="healthObservation.name" 
                urlParameter="observationType" />
        </fulfillment>
    </action>
    
    <!-- Custom App Action for Flex Coach -->
    <action intentName="com.flexbreak.WELLNESS_CHECK">
        <fulfillment urlTemplate="flexbreak://wellness/chat?message={message}">
            <parameter-mapping 
                intentParameter="message" 
                urlParameter="message" />
        </fulfillment>
        
        <!-- Trigger phrases -->
        <trigger-phrase>Talk to Flex Coach</trigger-phrase>
        <trigger-phrase>Open Flex Coach</trigger-phrase>
        <trigger-phrase>Start wellness check</trigger-phrase>
        <trigger-phrase>I need a stretch break</trigger-phrase>
    </action>
</actions>
```

### Step 5.3: Implement Voice Interaction Activity
Create `android/app/src/main/java/com/flexbreak/voice/VoiceInteractionActivity.java`:

```java
public class VoiceInteractionActivity extends Activity {
    private static final String TAG = "FlexBreakVoice";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Check if started by Google Assistant
        if (isVoiceInteraction()) {
            handleVoiceCommand();
        } else {
            handleDeepLink();
        }
    }
    
    private void handleVoiceCommand() {
        String query = getIntent().getStringExtra(SearchManager.QUERY);
        
        if (query == null) {
            // Get the action from App Actions
            String action = getIntent().getAction();
            Uri data = getIntent().getData();
            
            if (data != null) {
                String path = data.getPath();
                if (path.contains("exercise")) {
                    query = "I need exercise for " + data.getQueryParameter("type");
                } else if (path.contains("check")) {
                    query = "Check my " + data.getQueryParameter("type");
                } else {
                    query = data.getQueryParameter("message");
                }
            }
        }
        
        // Send to React Native
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("voiceCommand", query != null ? query : "Start wellness check");
        intent.putExtra("fromAssistant", true);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        
        // Provide voice feedback
        if (isVoiceInteractionRoot()) {
            VoiceInteractor.ConfirmationRequest request = 
                new VoiceInteractor.ConfirmationRequest(
                    new VoiceInteractor.Prompt("Opening Flex Coach for you"), 
                    null
                ) {
                    @Override
                    public void onConfirmationResult(
                        boolean confirmed, 
                        Bundle result
                    ) {
                        finish();
                    }
                };
            getVoiceInteractor().submitRequest(request);
        }
    }
}
```

### Step 5.4: Handle App Actions in MainActivity
Update `MainActivity.java`:

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    handleVoiceIntent(getIntent());
}

@Override
protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    handleVoiceIntent(intent);
}

private void handleAppAction(Intent intent) {
    String action = intent.getAction();
    Uri data = intent.getData();
    
    if (Intent.ACTION_VIEW.equals(action) && data != null) {
        String feature = data.getLastPathSegment();
        
        Bundle bundle = new Bundle();
        bundle.putString("feature", feature);
        
        // Send to React Native
        ReactContext reactContext = getReactInstanceManager()
            .getCurrentReactContext();
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("AppAction", bundle);
        }
    }
}
```

### Step 5.3: React Native Handler
```typescript
import { DeviceEventEmitter } from 'react-native';

useEffect(() => {
  const subscription = DeviceEventEmitter.addListener(
    'AppAction',
    (data) => {
      switch(data.feature) {
        case 'WELLNESS_CHECK':
          navigation.navigate('WellnessChat');
          break;
        case 'STRESS_RELIEF':
          navigation.navigate('WellnessChat', { 
            initialMessage: "I'm feeling stressed" 
          });
          break;
      }
    }
  );
  
  return () => subscription.remove();
}, []);
```

### Step 5.5: Create Google Assistant Service
Create `/src/services/googleAssistantService.ts`:

```typescript
import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';

const { GoogleAssistantBridge } = NativeModules;

export const googleAssistantService = {
  // Check if launched by Google Assistant
  isAssistantLaunch: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !GoogleAssistantBridge) return false;
    return await GoogleAssistantBridge.isAssistantLaunch();
  },
  
  // Get voice command from Assistant
  getVoiceCommand: async (): Promise<string | null> => {
    if (Platform.OS !== 'android' || !GoogleAssistantBridge) return null;
    return await GoogleAssistantBridge.getVoiceCommand();
  },
  
  // Common voice patterns to wellness inputs
  parseVoiceCommand: (command: string): { input: string; action?: string } => {
    const lowerCommand = command.toLowerCase();
    
    // Direct pain/issue mentions
    if (lowerCommand.includes('back') && (lowerCommand.includes('hurt') || lowerCommand.includes('pain'))) {
      return { input: 'My back hurts', action: 'pain_relief' };
    }
    
    if (lowerCommand.includes('stress') || lowerCommand.includes('anxious')) {
      return { input: "I'm feeling stressed", action: 'stress_relief' };
    }
    
    if (lowerCommand.includes('tired') || lowerCommand.includes('fatigue')) {
      return { input: "I'm tired", action: 'energy_boost' };
    }
    
    if (lowerCommand.includes('stretch') || lowerCommand.includes('exercise')) {
      return { input: 'I need a stretch break', action: 'exercise' };
    }
    
    // Default: use the command as-is
    return { input: command, action: 'wellness_check' };
  },
  
  // Provide voice feedback (TTS)
  speak: async (text: string): Promise<void> => {
    if (Platform.OS !== 'android' || !GoogleAssistantBridge) return;
    await GoogleAssistantBridge.speak(text);
  }
};

// Listen for voice commands
export const setupGoogleAssistantListener = (onCommand: (command: string) => void) => {
  if (Platform.OS === 'android') {
    const subscription = DeviceEventEmitter.addListener(
      'GoogleAssistantCommand',
      (event) => {
        if (event.command) {
          onCommand(event.command);
        }
      }
    );
    
    return () => subscription.remove();
  }
  
  return () => {};
};
```

### Step 5.6: Integrate with App
Update `App.tsx`:

```typescript
import { googleAssistantService, setupGoogleAssistantListener } from './src/services/googleAssistantService';

useEffect(() => {
  // Check if launched by Google Assistant
  const checkAssistantLaunch = async () => {
    const isAssistant = await googleAssistantService.isAssistantLaunch();
    if (isAssistant) {
      const command = await googleAssistantService.getVoiceCommand();
      if (command) {
        const { input, action } = googleAssistantService.parseVoiceCommand(command);
        
        // Process with AI
        const result = await aiWellnessService.processWellnessCheckIn(input, userId);
        
        // Provide voice feedback
        await googleAssistantService.speak(result.response);
        
        // Navigate to appropriate screen
        if (action === 'exercise') {
          navigation.navigate('Routines');
        } else {
          navigation.navigate('WellnessChat', { initialMessage: input });
        }
      }
    }
  };
  
  checkAssistantLaunch();
  
  // Set up listener for ongoing commands
  const unsubscribe = setupGoogleAssistantListener(async (command) => {
    const { input } = googleAssistantService.parseVoiceCommand(command);
    // Handle the command
    handleWellnessInput(input);
  });
  
  return unsubscribe;
}, []);
```

## Testing Strategy

### Phase 0: Rich Notifications Testing
#### iOS Rich Notifications
- [ ] Notification expands to show custom UI
- [ ] Avatar image displays correctly
- [ ] Quick action buttons (Chat/Voice) work
- [ ] Streak indicator shows correct count
- [ ] Long press shows rich preview
- [ ] Voice reply captures audio correctly
- [ ] Text reply sends to AI service

#### Android Expanded Notifications
- [ ] Custom layout displays properly
- [ ] Chat/Voice buttons launch app correctly
- [ ] Notification persists until interacted
- [ ] Works on Android 5.0+
- [ ] Respects Do Not Disturb settings

### Phase 1-3: Widget Testing
#### iOS Widget Tests
- [ ] Widget appears in widget gallery
- [ ] Data syncs via App Groups
- [ ] Updates reflect in widget within 1 hour
- [ ] Tap opens app to wellness chat
- [ ] Shows user name and language
- [ ] Displays last check-in time
- [ ] Works in all widget sizes

#### Android Widget Tests
- [ ] Widget can be added to home screen
- [ ] SharedPreferences data syncs
- [ ] Chat button opens app correctly
- [ ] Voice button launches voice mode
- [ ] Updates when app data changes
- [ ] Handles device rotation

### Phase 4: Siri Testing
#### Basic Commands
- [ ] "Hey Siri, check in with Flex Coach" → Opens app
- [ ] "Hey Siri, my back hurts" → Processes pain input
- [ ] "Hey Siri, I'm stressed" → Handles stress input
- [ ] "Hey Siri, I need a stretch" → Opens exercise

#### Advanced Features
- [ ] Siri Shortcuts appear in Settings
- [ ] Custom phrases can be recorded
- [ ] Works with AirPods/HomePod
- [ ] Provides voice feedback
- [ ] Opens app to correct screen
- [ ] Works in all supported languages

### Phase 5: Google Assistant Testing
#### Voice Commands
- [ ] "OK Google, talk to Flex Coach" → Opens app
- [ ] "OK Google, I need back pain relief" → Processes input
- [ ] "OK Google, start wellness check" → Opens chat
- [ ] "OK Google, help me relax" → Stress relief

#### Integration Features
- [ ] App Actions work from Assistant
- [ ] Voice feedback (TTS) works
- [ ] Handles multiple languages
- [ ] Works on phones and smart speakers
- [ ] Continues conversation in app

### Cross-Platform Testing
- [ ] Test on minimum OS versions (iOS 14, Android 5.0)
- [ ] Test with different languages (EN, ES, ZH)
- [ ] Test offline scenarios
- [ ] Test with app in background/killed state
- [ ] Verify premium vs free user experiences

## Deployment Plan

### Phase 0 (Week 1): Rich Notifications
- [ ] Implement iOS Notification Extensions
- [ ] Create Android custom notification layouts
- [ ] Test quick actions and deep links
- [ ] Deploy to beta testers

### Phase 1 (Week 2): Foundation
- [ ] Set up Expo development build
- [ ] Configure native modules
- [ ] Implement widget data service
- [ ] Set up App Groups (iOS) and SharedPreferences (Android)

### Phase 2 (Week 3-4): iOS Implementation
- [ ] Create iOS widget with WidgetKit
- [ ] Implement widget timeline provider
- [ ] Add Siri Shortcuts support
- [ ] Test on TestFlight with beta users

### Phase 3 (Week 5-6): Android Implementation
- [ ] Create Android home screen widget
- [ ] Implement Google Assistant App Actions
- [ ] Add voice interaction activity
- [ ] Test on Google Play internal track

### Phase 4 (Week 7): Integration & Polish
- [ ] Integrate all voice commands with AI service
- [ ] Add analytics tracking
- [ ] Fix bugs from beta testing
- [ ] Optimize performance and battery usage

### Phase 5 (Week 8): Release
- [ ] Update app store descriptions
- [ ] Create demo videos for new features
- [ ] Submit for app store review
- [ ] Plan marketing for new features

## Security Considerations

1. **Data Privacy**: Only sync non-sensitive wellness data to widgets
2. **Authentication**: Widgets should not access protected user data
3. **Encryption**: Use encrypted storage for widget data
4. **Permissions**: Request minimal permissions for voice assistants

## Performance Optimization

1. **Widget Updates**: Limit to hourly to conserve battery
2. **Data Size**: Keep widget data payload under 1KB
3. **Caching**: Cache widget views for faster loading
4. **Background Tasks**: Use efficient background APIs

## Localization

1. Widget strings in all supported languages (EN, ES, ZH)
2. Voice commands in native languages
3. Date/time formatting based on locale
4. RTL support for future languages

## Analytics & Monitoring

Track:
- Widget installation rate
- Widget interaction rate
- Voice command usage
- Deep link conversions
- Error rates

## Troubleshooting Guide

Common issues and solutions:
1. **Widget not updating**: Check app group configuration
2. **Voice commands not working**: Verify intent definitions
3. **Deep links failing**: Check URL scheme registration
4. **Data sync issues**: Verify shared storage permissions

## Resources

- [Apple WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [Android App Widgets Guide](https://developer.android.com/guide/topics/appwidgets)
- [SiriKit Programming Guide](https://developer.apple.com/documentation/sirikit)
- [Google Assistant App Actions](https://developers.google.com/assistant/app)

## Implementation Checklist

### Immediate Actions (Start with Phase 0)
1. [ ] Create Expo development build
2. [ ] Set up iOS Notification Extensions in Xcode
3. [ ] Create Android notification layouts
4. [ ] Test rich notifications on both platforms

### Development Environment Setup
1. [ ] Install Expo Dev Client: `expo install expo-dev-client`
2. [ ] Configure EAS Build for custom native code
3. [ ] Set up Xcode with developer certificates
4. [ ] Configure Android Studio
5. [ ] Create development builds for testing

### Required Configurations

#### iOS (app.json)
```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.developer.siri": true,
        "com.apple.security.application-groups": [
          "group.com.flexbreak.wellness"
        ]
      },
      "infoPlist": {
        "NSUserActivityTypes": [
          "com.flexbreak.wellness.check",
          "com.flexbreak.wellness.report"
        ]
      }
    }
  }
}
```

#### Android (app.json)
```json
{
  "expo": {
    "android": {
      "permissions": [
        "com.google.android.gms.permission.ACTIVITY_RECOGNITION",
        "android.permission.RECORD_AUDIO"
      ],
      "intentFilters": [
        {
          "action": "com.google.android.gms.actions.SEARCH_ACTION",
          "category": ["android.intent.category.DEFAULT"]
        }
      ]
    }
  }
}
```

## Next Steps

1. **Start with Rich Notifications** (Phase 0) - Immediate impact, easier implementation
2. Set up development environment with EAS Build
3. Create feature branch: `feature/rich-notifications-widgets-voice`
4. Implement rich notifications for both platforms
5. Test with beta users
6. Then proceed to widget implementation

---

**Document Version**: 2.0  
**Last Updated**: December 2024  
**Author**: FlexBreak Development Team

**Key Changes in v2.0**:
- Added Phase 0: Rich Notifications as primary implementation
- Expanded voice assistant integration details
- Added specific code examples for all platforms
- Included testing checklists for each phase
- Updated deployment timeline to be more realistic