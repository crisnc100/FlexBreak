# Safe AI System Cleanup Plan

## Phase 1: Pre-Cleanup Preparation (DO THIS FIRST)

### 1. Update Component Dependencies

#### FlexChatModal.tsx
- Currently uses: `wellnessMemory.getMemory(userId)`
- Update to: `improvedMemory.getMemory(userId)`
- Test that user name retrieval still works

#### AIDataManagement.tsx
- Check usage of wellnessMemory
- Update to use improvedMemory

### 2. DO NOT DELETE These Files (Still in Use)

#### Critical Dependencies:
1. **errorHandler.ts** - Used by:
   - openRouterService.ts
   - googleSpeechService.ts
   - aiWellnessService.ts
   
2. **retryUtil.ts** - Used by:
   - openRouterService.ts
   - googleSpeechService.ts
   - aiWellnessService.ts

3. **contextBuilder.ts** - Functions still needed:
   - `buildUserContext` - used in both AI services
   - `categorizeInput` - used in both AI services
   - `detectLanguage` - used in conversationManager

4. **promptTemplates.ts** - Data still needed:
   - `WELLNESS_COACH_PROMPT` - used in both services
   - `FALLBACK_RESPONSES` - used in both services

5. **responseFormatter.ts** - Functions needed:
   - `formatAIResponse` - used in both services

6. **simpleMemory.ts** - Still actively used for:
   - Usage tracking in aiWellnessService.ts
   - Language preference fallback

7. **memoryMigration.ts** - Called in:
   - systemInitializer.ts during app startup

## Phase 2: Safe Consolidation Steps

### Step 1: Create Compatibility Layer

Before deleting, create a compatibility layer in improvedMemory.ts:

```typescript
// Add to improvedMemory.ts
export const getMemory = async (userId: string) => {
  // Return format compatible with wellnessMemory
  const memory = await improvedMemory.getMemory(userId);
  return {
    userName: memory.userName,
    // ... other fields FlexChatModal expects
  };
};
```

### Step 2: Test New Service

1. Test aiWellnessServiceV2 with existing components
2. Verify conversation tracking works
3. Test negative feedback scenarios
4. Test with all 3 languages

### Step 3: Gradual Migration

1. **Week 1**: Update imports in test files only
2. **Week 2**: Update one component at a time:
   - FlexChatModal → use improvedMemory
   - AIDataManagement → use improvedMemory
3. **Week 3**: Switch main service:
   - Rename aiWellnessService.ts → aiWellnessServiceOld.ts
   - Rename aiWellnessServiceV2.ts → aiWellnessService.ts

## Phase 3: Final Cleanup (After Testing)

### Files Safe to Delete:
1. **costTracker.ts** - Already replaced by costMonitor
2. **aiWellnessServiceOld.ts** - After V2 is stable
3. **wellnessMemory.ts** - After updating all components
4. **memoryMigration.ts** - After verifying all users migrated

### Files to Keep But Consolidate:

1. **Merge into core/promptManager.ts:**
   - Content from promptTemplates.ts
   - Functions from responseFormatter.ts

2. **Merge into core/conversationManager.ts:**
   - Essential functions from contextBuilder.ts

3. **Create reliability/reliabilityManager.ts:**
   - Merge errorHandler.ts + retryUtil.ts
   - Update all imports in core services

### Files to Keep As-Is:
- simpleMemory.ts (until full memory consolidation)
- improvedMemory.ts (primary memory system)
- All services using errorHandler/retryUtil

## Testing Before Cleanup

### Component Tests:
```bash
# Test each component that uses AI services
npm test -- FlexChatModal
npm test -- AIDataManagement
npm test -- SettingsScreen
```

### Integration Tests:
```bash
# Test the full flow
npm test -- aiWellnessService.integration
```

### Manual Testing:
1. Send wellness check-in
2. Test negative feedback ("that didn't help")
3. Test in Spanish and Chinese
4. Test notification responses
5. Check memory persistence

## Rollback Plan

If anything breaks:
1. Git revert to previous commit
2. Restore original imports
3. Clear AsyncStorage AI data if needed:
   ```typescript
   await AsyncStorage.multiRemove([
     '@ai_conversation_session_*',
     '@ai_improved_memory_*'
   ]);
   ```

## Summary

**DO NOT DELETE** until:
1. All components updated to use new imports
2. Core services (openRouter, googleSpeech) updated
3. Full testing completed
4. At least 1 week of stable operation

**Safe to Delete Now:**
- costTracker.ts only

**Everything else:** Requires careful migration first!