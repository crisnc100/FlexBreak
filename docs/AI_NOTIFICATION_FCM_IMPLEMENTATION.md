# AI Notification FCM Implementation - Complete Documentation

## Summary for AI Agents
This document details the implementation of a Firebase Cloud Messaging (FCM) based AI notification response system for the FlexBreak app. The system allows users to reply to AI wellness notifications when the app is completely killed/closed, with responses processed server-side via Firebase Cloud Functions and sent back as push notifications.

## Problem Statement
- **Original Issue**: AI wellness notifications worked when app was open/background, but when the app was killed, users couldn't receive AI responses to their notification replies
- **Root Cause**: iOS/Android notification handlers can't execute JavaScript when app is killed
- **Solution**: Server-side processing via Firebase Cloud Functions + FCM

## Architecture Overview

```
User Reply (App Killed) → FCM → Firebase Cloud Function → OpenRouter AI API → FCM → Push Notification
User Reply (App Open) → Local AI Service → OpenRouter AI API → In-App Response
```

### Hybrid Approach
- **Notifications (App Killed)**: Uses Firebase Cloud Functions
- **FlexChat Modal (App Open)**: Uses local processing for lower latency
- **Benefits**: Best of both worlds - reliability when killed, speed when open

## Implementation Steps Completed

### 1. Fixed AI Response Issues ✅
- **Name Hallucination**: AI was saying "Hi John/Emily/Alex" without user providing name
  - Fixed in: `/src/services/ai/core/promptManager.ts`
  - Added strict rules against using names unless explicitly provided
  
- **Canned Responses**: AI assumed users were "feeling drained in mid-workday"
  - Fixed by removing presumptuous time context
  - Added instructions not to assume user state

- **Text Truncation in Modal**: Responses were being cut off in FlexChat
  - Added `isFromModal` parameter to `processWellnessCheckIn()`
  - Notifications truncate at 180 chars, modal shows full response

### 2. Firebase Cloud Functions Setup ✅

#### Created Functions:
1. **handleAINotificationResponse** (onCall)
   - Processes notification replies when app is killed
   - Calls OpenRouter AI API with user message
   - Sends response back via FCM
   
2. **handleAINotificationResponseHTTP** (onRequest)  
   - HTTP endpoint alternative for testing
   - URL: https://us-central1-flexbreak-28ad0.cloudfunctions.net/handleAINotificationResponseHTTP

#### Key Files Created/Modified:
- `/functions/src/aiNotificationHandler.ts` - Cloud function implementation
- `/src/services/fcmService.ts` - FCM token management
- `/src/services/notifications/aiNotificationHandler.ts` - Updated to use FCM when app in background

### 3. Deployment Issues Resolved ✅
- **Critical Issue**: Firebase Tools v14.0.0+ has a bug causing "Cannot read properties of null (reading 'length')"
- **Solution**: Downgraded to firebase-tools@13.35.1
- **Deployment Command**: `npx firebase deploy --only functions` (using local version)

### 4. Configuration Completed ✅
- OpenRouter API key stored as Firebase Secret: `OPENROUTER_API_KEY`
- FCM tokens stored in Firestore under `users` collection
- Conversation history tracked in `ai_conversations` collection

## Testing Steps Required

### 1. Basic Function Test
```bash
curl -X POST https://us-central1-flexbreak-28ad0.cloudfunctions.net/handleAINotificationResponseHTTP \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "userMessage": "I feel tired today",
    "fcmToken": "ACTUAL_FCM_TOKEN_HERE"
  }'
```

### 2. End-to-End Notification Test
1. **Setup**:
   - Enable AI Wellness in app settings
   - Grant notification permissions
   - Verify FCM token is stored in Firestore

2. **Test Flow**:
   - Completely kill the app (swipe from recents)
   - Wait for AI wellness notification
   - Reply with text (e.g., "I'm feeling great!")
   - Expected: Receive AI response notification within 2-5 seconds
   - App should remain closed throughout

3. **Verify**:
   ```bash
   # Check function logs
   npx firebase functions:log --only handleAINotificationResponse
   ```
   - Look for "Processing AI notification response"
   - Check for "AI response notification sent"

### 3. FCM Token Verification
- Check Firestore: `users/{userId}` document should have `fcmToken` field
- Token should update when app launches

## Known Issues & Limitations

1. **iOS Limitations**:
   - Expo doesn't directly expose native FCM tokens on iOS
   - Using Expo Push Token which works with FCM

2. **Cost Considerations**:
   - Firebase Functions: First 2M invocations/month free
   - OpenRouter: Using free Mistral 7B model
   - FCM: Completely free

3. **Response Time**:
   - 2-5 second delay when app is killed (network round trip)
   - Instant when app is open (local processing)

## Monitoring & Debugging

### Check Function Health
```bash
# View logs
npx firebase functions:log

# Check specific function
npx firebase functions:log --only handleAINotificationResponse
```

### Firebase Console
- Functions: https://console.firebase.google.com/project/flexbreak-28ad0/functions
- Firestore: https://console.firebase.google.com/project/flexbreak-28ad0/firestore
- Cloud Messaging: https://console.firebase.google.com/project/flexbreak-28ad0/messaging

## Security Considerations
- OpenRouter API key stored in Firebase Secrets (not in client code)
- User conversations isolated by userId in Firestore
- FCM tokens expire and refresh automatically

## Next Steps for Future Development

1. **Enhanced Features**:
   - Add typing indicators for notification responses
   - Implement conversation context (pass previous messages)
   - Add multilingual support with language detection

2. **Optimization**:
   - Cache common responses for faster delivery
   - Batch process multiple notifications
   - Add retry logic for failed API calls

3. **Analytics**:
   - Track notification response rates
   - Monitor AI response quality
   - Measure user engagement metrics

## Important Notes for Developers

1. **Always use firebase-tools v13.35.1** for deployments until v14 bug is fixed
2. **API Key Management**: Use `firebase functions:secrets:set` for any API keys
3. **Testing**: Always test with app completely killed, not just backgrounded
4. **Hybrid Approach**: Keep local processing for in-app responses (better UX)

## File Structure Reference
```
/functions/
  /src/
    aiNotificationHandler.ts    # Cloud functions for AI responses
    sendMotivationalMessages.ts # Existing notification functions
    index.ts                   # Exports all functions
    
/src/
  /services/
    fcmService.ts              # FCM token management
    /notifications/
      aiNotificationHandler.ts # Local notification handler
    /ai/core/
      aiWellnessService.ts     # AI processing logic
      promptManager.ts         # AI prompts and rules
```

## Deployment Commands Reference
```bash
# Set API key (one time)
firebase functions:secrets:set OPENROUTER_API_KEY

# Build and deploy
cd functions
npm run build
npx firebase deploy --only functions

# Deploy specific functions
npx firebase deploy --only functions:handleAINotificationResponse,functions:handleAINotificationResponseHTTP

# View logs
npx firebase functions:log
```

---

**Status**: ✅ Implementation Complete, Testing Required