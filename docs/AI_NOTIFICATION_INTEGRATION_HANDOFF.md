# AI Notification System - Engineering Handoff Document

**Date**: July 3, 2025  
**Feature**: FCM-based AI Wellness Notification Response System  
**Status**: Core implementation complete, integration testing required  
**Priority**: High - User-facing feature affecting engagement metrics

## Executive Summary

We've implemented a server-side notification response system that allows users to interact with the AI Flex Coach through push notifications when the app is killed. The system uses Firebase Cloud Functions to process responses and Firebase Cloud Messaging (FCM) to deliver AI-generated replies.

## Technical Architecture

### System Flow
```
1. User receives AI wellness notification (e.g., "How are you feeling today?")
2. User replies directly in notification (iOS/Android native reply)
3. When app is killed: FCM → Cloud Function → OpenRouter AI → FCM → Push Notification
4. When app is open: Local processing for lower latency
```

### Key Components

#### Cloud Functions (Firebase)
- **handleAINotificationResponse**: Main function processing notification replies
- **handleAINotificationResponseHTTP**: HTTP endpoint for testing/fallback
- **Deployment**: Using firebase-tools@13.35.1 (v14 has critical bug)
- **Runtime**: Node.js 20, Firebase Functions v6.3.2

#### Client-Side Services
- **FCMService** (`/src/services/fcmService.ts`): Manages FCM tokens, handles cloud function calls
- **AINotificationHandler** (`/src/services/notifications/aiNotificationHandler.ts`): Routes responses based on app state
- **AIWellnessService** (`/src/services/ai/core/aiWellnessService.ts`): Core AI processing logic

#### Data Storage
- **Firestore Collections**:
  - `users/{userId}`: Stores FCM tokens, premium status
  - `ai_conversations/{userId}`: Conversation history, last messages
- **Firebase Secrets**: `OPENROUTER_API_KEY` for AI API access

## Current State Analysis

### What's Working
- ✅ Firebase Functions deployed and accessible
- ✅ FCM token generation and storage logic implemented
- ✅ AI response generation with proper truncation for notifications
- ✅ Hybrid routing (FCM when killed, local when open)
- ✅ Error handling and fallback responses

### Known Issues
1. **FCM Token Reliability**: Token generation needs to be triggered when AI Wellness is enabled
2. **iOS Token Mapping**: Using Expo tokens on iOS, may need native FCM token support
3. **Cold Start Latency**: First response after inactivity may take 5-10 seconds
4. **No Conversation Context**: Each notification is treated as isolated interaction

## Integration Requirements

### 1. FCM Token Management
```typescript
// Required during AI Wellness enablement
// File: src/screens/SettingsScreen.tsx or AI toggle component

const handleAIWellnessToggle = async (enabled: boolean) => {
  if (enabled) {
    // Critical: Ensure FCM token is generated and stored
    const token = await fcmService.getFCMToken();
    if (!token) {
      // Handle token generation failure
      console.error('Failed to generate FCM token');
      // Show user error: "Notification permissions required"
    }
  }
  // Existing toggle logic...
};
```

### 2. App State Detection Fix
```typescript
// File: src/services/notifications/aiNotificationHandler.ts
// Current implementation has a race condition

// Problem: AppState.currentState may be stale
const appState = AppState.currentState;
const shouldUseFCM = appState === 'background' || appState === 'inactive';

// Solution: Add proper app state tracking
let currentAppState = AppState.currentState;
AppState.addEventListener('change', (nextAppState) => {
  currentAppState = nextAppState;
});
```

### 3. Notification Permission Flow
```typescript
// Ensure permissions before enabling AI Wellness
const checkNotificationPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  }
  return true;
};
```

## Testing Protocol

### Phase 1: Function Verification
```bash
# 1. Test HTTP endpoint directly
curl -X POST https://us-central1-flexbreak-28ad0.cloudfunctions.net/handleAINotificationResponseHTTP \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_${DATE}",
    "userMessage": "I feel great today!",
    "fcmToken": "ExponentPushToken[xxxxxx]"  # Use real token from logs
  }'

# Expected: 200 OK with AI response
# Monitor: firebase functions:log
```

### Phase 2: End-to-End Testing

#### Test Case 1: App Killed State
1. Enable AI Wellness in settings
2. Verify FCM token in Firestore: `users/{yourUserId}/fcmToken`
3. Force kill app (remove from recents)
4. Trigger notification: Wait for scheduled or use test function
5. Reply to notification: "I'm feeling tired"
6. Expected: AI response notification within 5 seconds
7. Verify: Check `ai_conversations/{userId}` for stored interaction

#### Test Case 2: App Background State
1. Open app, enable AI Wellness
2. Press home button (app in background)
3. Trigger notification
4. Reply to notification
5. Expected: Faster response than killed state
6. Verify: No duplicate notifications

#### Test Case 3: Error Scenarios
1. Test with invalid FCM token
2. Test with OpenRouter API down (remove API key temporarily)
3. Test with malformed user input (empty string, special characters)
4. Expected: Graceful error notifications

### Phase 3: Platform-Specific Testing

#### iOS Testing
- Test on physical device (simulators don't support push)
- Verify notification categories are registered
- Test with app in various states
- Check notification delivery when device is locked

#### Android Testing
- Verify notification channel (`ai_wellness`) is created
- Test with battery optimization enabled
- Test with different notification priorities
- Verify deep sleep/doze mode behavior

## Performance Metrics to Monitor

### Cloud Function Metrics
- **Cold Start Time**: Should be < 3 seconds
- **Execution Time**: Target < 2 seconds for AI response
- **Error Rate**: Should be < 1%
- **Cost**: Monitor invocations (2M free/month)

### Client Metrics
- **FCM Token Success Rate**: > 95%
- **Notification Delivery Rate**: Track via Firebase Analytics
- **User Response Rate**: % of notifications that get replies
- **Time to Response**: From user reply to AI notification

## Security Considerations

1. **API Key Management**: 
   - OpenRouter key in Firebase Secrets ✅
   - Never log full API responses
   - Implement rate limiting per user

2. **User Data**:
   - PII only in Firestore with proper rules
   - Conversation history retention policy needed
   - GDPR compliance for EU users

3. **Input Validation**:
   - Sanitize user messages before AI processing
   - Limit message length (current: 1000 chars)
   - Filter profanity/inappropriate content

## Rollout Strategy

### Week 1: Internal Testing
- Test with team devices
- Monitor all error logs
- Verify cost projections
- Document edge cases

### Week 2: Beta Users (5-10%)
- Enable for premium users first
- Add feature flag: `ai_notification_responses_enabled`
- Monitor metrics closely
- Gather qualitative feedback

### Week 3: Gradual Rollout
- 25% → 50% → 100% over the week
- A/B test response quality
- Monitor system load
- Prepare scaling strategy

## Future Enhancements (Post-Launch)

### High Priority
1. **Conversation Context**: Pass last 2-3 messages to AI
2. **Typing Indicators**: Show "AI is thinking..." notification
3. **Quick Replies**: Pre-set response buttons
4. **Analytics Dashboard**: Response rates, popular queries

### Medium Priority
1. **Multi-language Support**: Detect and respond in user's language
2. **Voice Transcription**: Accept voice replies
3. **Rich Media**: Include images/GIFs in responses
4. **Scheduled Follow-ups**: AI initiates based on previous conversation

### Low Priority
1. **Web Dashboard**: View conversation history
2. **Export Data**: User data portability
3. **Custom AI Models**: Per-user fine-tuning
4. **Integration APIs**: Connect with other wellness apps

## Critical Paths & Dependencies

### Must Have Before Launch
1. ✅ FCM token generation on AI Wellness enable
2. ⏳ Comprehensive error handling
3. ⏳ User onboarding explaining the feature
4. ⏳ Analytics event tracking
5. ⏳ Cost monitoring alerts

### External Dependencies
- **OpenRouter API**: No SLA, need fallback
- **Firebase Services**: 99.95% uptime SLA
- **FCM Delivery**: Platform-dependent, no guarantees

## Support & Troubleshooting

### Common Issues
1. **"No response received"**
   - Check FCM token in Firestore
   - Verify notification permissions
   - Check function logs for errors

2. **"Delayed responses"**
   - Cold start issue, pre-warm functions
   - Check OpenRouter API latency
   - Verify Firebase region (us-central1)

3. **"Can't reply to notifications"**
   - iOS: Verify notification categories
   - Android: Check notification channel
   - Both: Ensure latest app version

### Debug Commands
```bash
# View real-time logs
npx firebase functions:log --follow

# Check specific user's token
firebase firestore:get users/USER_ID

# Test function directly
firebase functions:shell
> handleAINotificationResponse({userId: "test", userMessage: "Hello", fcmToken: "token"})

# Monitor costs
firebase projects:billing:estimate
```

## Contact & Escalation

- **Feature Owner**: AI Wellness Team
- **Technical Lead**: [Your Name]
- **On-Call**: Check PagerDuty rotation
- **Escalation**: If > 10% error rate or > $100/day cost

## Appendix: Code Locations

```
/functions/src/
  aiNotificationHandler.ts      # Cloud functions
  
/src/services/
  fcmService.ts                # FCM token management
  notifications/
    aiNotificationHandler.ts   # Client-side handler
  ai/core/
    aiWellnessService.ts      # AI processing logic
    promptManager.ts          # AI prompts
    
/docs/
  FCM_AI_NOTIFICATION_SETUP.md          # Deployment guide
  AI_NOTIFICATION_FCM_IMPLEMENTATION.md  # Technical details
```

---

**Next Action**: Begin Phase 1 testing immediately. Report findings in #ai-wellness-dev channel.