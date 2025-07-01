# AI Wellness V2 Migration Guide

## Overview

The AI Wellness V2 system introduces conversation context tracking and enhanced response generation. This guide explains how to migrate from the current system to V2.

## Key Changes

### 1. New Components
- **ConversationManager**: Tracks conversation sessions and user feedback
- **PromptManager**: Generates dynamic prompts based on conversation context
- **AIWellnessServiceV2**: Enhanced service with conversation awareness

### 2. Features Added
- Session-based conversation tracking
- Sentiment analysis (positive/negative/neutral)
- Automatic alternative suggestions after negative feedback
- Success/failure pattern tracking
- Enhanced multilingual support

## Migration Steps

### Step 1: Test New Components

Before migrating, test the new system alongside the existing one:

```typescript
// In your test environment
import aiWellnessServiceV2 from './services/ai/aiWellnessServiceV2';

// Test with a sample user
const response = await aiWellnessServiceV2.processWellnessCheckIn(
  "My back hurts",
  testUserId
);
```

### Step 2: Update Import References

Replace the old service import with the new one:

```typescript
// Old
import aiWellnessService from './services/ai/aiWellnessService';

// New
import aiWellnessService from './services/ai/aiWellnessServiceV2';
```

### Step 3: Update Components

The API remains the same, so no component changes are needed:

```typescript
// This continues to work as before
const result = await aiWellnessService.processWellnessCheckIn(
  userInput,
  userId,
  isNotification
);
```

### Step 4: Feature Flag (Recommended)

For safe rollout, use a feature flag:

```typescript
// In your wellness chat component
const useV2 = await AsyncStorage.getItem('@ai_wellness_v2_enabled') === 'true';

const aiService = useV2 
  ? require('./services/ai/aiWellnessServiceV2').default
  : require('./services/ai/aiWellnessService').default;
```

### Step 5: Monitor Performance

Track these metrics during migration:
- Response time
- User satisfaction (via feedback)
- Token usage
- Error rates

## Testing Checklist

### Basic Functionality
- [ ] User can send wellness check-in
- [ ] AI responds appropriately
- [ ] Language detection works (EN/ES/ZH)
- [ ] Rate limiting enforced
- [ ] Cost tracking works

### New Features
- [ ] Negative feedback triggers alternative suggestion
- [ ] Conversation context persists within session
- [ ] Sentiment correctly identified
- [ ] Failed suggestions not repeated

### Edge Cases
- [ ] Session timeout after 30 minutes
- [ ] Storage failures handled gracefully
- [ ] API failures use fallback responses
- [ ] Very long conversations truncated properly

## Rollback Plan

If issues arise, rollback is simple:

1. Change imports back to original service
2. Clear conversation session storage:
   ```typescript
   await AsyncStorage.removeItem(`@ai_conversation_session_${userId}`);
   ```
3. Monitor for any persistent issues

## Data Migration

No data migration needed - the V2 system:
- Uses the same memory systems (improvedMemory)
- Maintains the same storage keys
- Preserves all existing user data

## Performance Considerations

### Token Usage
- V2 includes conversation history in prompts
- Expect 20-30% increase in input tokens
- Output tokens remain the same
- Cost increase is minimal due to context limits

### Storage
- New conversation sessions stored separately
- Auto-cleanup after session timeout
- Maximum 20 messages per session
- Negligible storage impact

## Support

For issues during migration:
1. Check error logs for conversation manager errors
2. Verify AsyncStorage permissions
3. Test with a fresh user ID first
4. Report issues with full error context

## Timeline

Recommended migration timeline:
- **Week 1**: Test V2 with internal users
- **Week 2**: 10% rollout with feature flag
- **Week 3**: 50% rollout if metrics are good
- **Week 4**: 100% rollout and cleanup

## Code Cleanup (Post-Migration)

After successful migration:
1. Remove old aiWellnessService.ts
2. Rename aiWellnessServiceV2.ts to aiWellnessService.ts
3. Update all imports
4. Remove feature flag code
5. Archive old test files