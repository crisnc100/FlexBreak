# AI Wellness Coach Context Improvement & File Cleanup Plan

## Problem Statement

The AI Wellness Coach currently lacks deep contextual understanding of user responses and conversation flow. For example:
- When user says "that didn't help" after trying a suggestion, the AI doesn't adapt
- Doesn't track conversation history within a session
- Doesn't learn from negative feedback or adjust recommendations
- Generic responses that don't build on previous exchanges

## Current Architecture Analysis

### Core Files
1. **aiWellnessService.ts** (408 lines) - Main service, handles processing
2. **promptTemplates.ts** (104 lines) - Static prompts, needs dynamic context
3. **contextBuilder.ts** (161 lines) - Basic context, no conversation tracking
4. **openRouterService.ts** (163 lines) - API integration

### Memory Systems (Redundant)
1. **simpleMemory.ts** (239 lines) - Old system
2. **improvedMemory.ts** (313 lines) - New system
3. **wellnessMemory.ts** (235 lines) - Another memory variant
4. **memoryMigration.ts** (93 lines) - Migration utility

### Supporting Files
1. **aiWellnessSchedulerV2.ts** (415 lines) - Notification scheduling
2. **notificationMessages.ts** - Message generation
3. **responseFormatter.ts** - Response formatting
4. **costMonitor.ts** (241 lines) - Cost tracking
5. **rateLimiter.ts** (196 lines) - Rate limiting
6. **errorHandler.ts** (347 lines) - Error handling
7. **retryUtil.ts** (242 lines) - Retry logic
8. **configValidator.ts** (198 lines) - Configuration validation
9. **systemInitializer.ts** (169 lines) - System initialization

## Proposed Improvements

### 1. Conversation Context Enhancement

#### Current Issues:
- No session-based conversation history
- Doesn't understand user feedback (positive/negative)
- Can't reference previous suggestions
- No emotional state tracking

#### Solutions:

**A. Add Conversation Session Manager**
```typescript
interface ConversationSession {
  sessionId: string;
  startTime: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    sentiment?: 'positive' | 'negative' | 'neutral';
    effectiveness?: boolean;
  }>;
  currentMood?: string;
  failedSuggestions: string[];
  successfulSuggestions: string[];
}
```

**B. Enhanced Prompt System**
Instead of static prompts, use dynamic templates that include:
- Recent conversation history (last 3-5 exchanges)
- User's response to previous suggestions
- Identified patterns of what works/doesn't work
- Current emotional state

**C. Feedback Recognition**
Add pattern matching for user feedback:
```typescript
const NEGATIVE_FEEDBACK_PATTERNS = {
  en: [
    "didn't help", "not working", "still hurts", "worse", 
    "doesn't work", "no better", "same problem"
  ],
  es: ["no ayudó", "no funciona", "sigue doliendo", "peor"],
  zh: ["没有帮助", "不管用", "还是疼", "更糟"]
};

const POSITIVE_FEEDBACK_PATTERNS = {
  en: ["helped", "better", "thanks", "great", "worked"],
  es: ["ayudó", "mejor", "gracias", "funcionó"],
  zh: ["有帮助", "好多了", "谢谢", "有效"]
};
```

### 2. Improved Response Generation

#### Smart Response Logic:
```typescript
async generateContextualResponse(
  userInput: string,
  conversationHistory: Message[],
  userProfile: UserProfile
): Promise<string> {
  // 1. Analyze user's response sentiment
  const sentiment = analyzeSentiment(userInput);
  
  // 2. Check if responding to previous suggestion
  const isFollowUp = isResponseToPreviousSuggestion(userInput, conversationHistory);
  
  // 3. If negative feedback, pivot strategy
  if (isFollowUp && sentiment === 'negative') {
    return generateAlternativeSuggestion(userInput, conversationHistory);
  }
  
  // 4. Build rich context
  const context = buildEnhancedContext(userInput, conversationHistory, userProfile);
  
  // 5. Generate response with full context
  return generateAIResponse(context);
}
```

### 3. Enhanced Prompt Templates

**Current Basic Prompt:**
```
You are FlexBreak's AI wellness coach. {context}
Give ONE practical tip (1-2 sentences).
```

**Improved Contextual Prompt:**
```
You are FlexBreak's AI wellness coach having an ongoing conversation.

CONVERSATION HISTORY:
{conversationHistory}

USER PROFILE:
- Previous issues: {userIssues}
- What has worked: {effectiveSolutions}
- What hasn't worked: {ineffectiveSolutions}
- Current mood: {currentMood}

USER'S CURRENT MESSAGE: {userInput}

IMPORTANT CONTEXT:
{specificContext}

RESPONSE GUIDELINES:
- If user says previous suggestion didn't help, acknowledge and offer different approach
- Reference conversation history when relevant
- Avoid repeating failed suggestions
- Show understanding of their specific situation
- Keep response concise and actionable
```

### 4. File Consolidation Plan

#### Files to Merge/Delete:

**1. Consolidate Memory Systems**
- Keep: `improvedMemory.ts` (most complete)
- Delete: `simpleMemory.ts`, `wellnessMemory.ts`
- Move migration logic into improvedMemory.ts

**2. Combine Context Building**
- Merge: `contextBuilder.ts` + conversation logic into `conversationManager.ts`
- This will handle both context and conversation state

**3. Consolidate Prompt Management**
- Merge: `promptTemplates.ts` + `responseFormatter.ts` into `promptManager.ts`
- Dynamic prompt generation based on context

**4. Combine Error Handling**
- Merge: `errorHandler.ts` + `retryUtil.ts` into `reliabilityManager.ts`
- Unified error handling and retry logic

#### New File Structure:
```
src/services/ai/
├── core/
│   ├── aiWellnessService.ts (main service)
│   ├── conversationManager.ts (context + history)
│   ├── promptManager.ts (prompts + formatting)
│   └── openRouterService.ts (API calls)
├── memory/
│   └── memoryService.ts (consolidated memory)
├── reliability/
│   ├── reliabilityManager.ts (errors + retry)
│   ├── rateLimiter.ts
│   └── costMonitor.ts
├── scheduling/
│   ├── notificationScheduler.ts
│   └── notificationMessages.ts
└── config/
    ├── configValidator.ts
    └── systemInitializer.ts
```

## Implementation Plan

### Phase 1: Conversation Context (Week 1)
1. Create `conversationManager.ts` with session tracking
2. Add sentiment analysis for user feedback
3. Implement conversation history in prompts
4. Test with example scenarios

### Phase 2: Enhanced Responses (Week 2)
1. Upgrade prompt templates with dynamic context
2. Add feedback recognition patterns
3. Implement alternative suggestion logic
4. Create response adaptation system

### Phase 3: File Cleanup (Week 3)
1. Backup existing files
2. Consolidate memory systems
3. Merge related functionality
4. Update all imports
5. Test thoroughly

## Example Improvements

### Before:
```
User: "My back hurts"
AI: "Try this: Stand up and do gentle back stretches"
User: "That didn't help"
AI: "Take 5 deep breaths and roll your shoulders"
```

### After:
```
User: "My back hurts"
AI: "Try this: Stand up and do gentle back stretches"
User: "That didn't help"
AI: "I understand the stretches didn't work. Since movement isn't helping, try applying heat to your lower back for 15 minutes, or lie flat with knees bent. What kind of pain are you feeling - sharp or dull?"
```

## Success Metrics

1. **Context Awareness**: AI references previous exchanges in 80%+ of follow-up responses
2. **Feedback Recognition**: Correctly identifies positive/negative feedback 90%+ of the time
3. **Adaptation Rate**: Provides different suggestions after negative feedback 100% of the time
4. **User Satisfaction**: Reduced "generic response" complaints
5. **Code Reduction**: 30% fewer files, 20% less code duplication

## Testing Scenarios

1. **Negative Feedback Loop**
   - User tries suggestion → Says it didn't work → AI pivots approach

2. **Building Context**
   - Multiple exchanges about same issue → AI shows understanding

3. **Emotional Recognition**
   - User expresses frustration → AI acknowledges and adapts tone

4. **Solution Memory**
   - AI remembers what worked/didn't work across sessions

## Migration Strategy

1. Create new files in parallel
2. Add feature flags for gradual rollout
3. Run A/B tests with subset of users
4. Monitor feedback and iterate
5. Full rollout after validation

## Risk Mitigation

1. **Backward Compatibility**: Keep old system available via feature flag
2. **Data Migration**: Automated migration for existing user data
3. **Performance**: Monitor token usage with enhanced context
4. **Testing**: Comprehensive test suite before deployment