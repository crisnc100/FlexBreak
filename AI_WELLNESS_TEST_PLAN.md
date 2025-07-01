# AI Wellness Coach Testing Plan

## Phase 1: Conversation Context Testing

### Unit Tests

#### ConversationManager Tests
1. **Session Management**
   - Test session creation and timeout
   - Test session persistence across interactions
   - Test session cleanup after timeout

2. **Message Tracking**
   - Test adding user/assistant messages
   - Test message limit enforcement
   - Test conversation history retrieval

3. **Sentiment Analysis**
   - Test positive feedback detection (all languages)
   - Test negative feedback detection (all languages)
   - Test neutral sentiment classification

4. **Effectiveness Tracking**
   - Test suggestion success/failure tracking
   - Test follow-up detection logic
   - Test pattern identification

#### PromptManager Tests
1. **Context Building**
   - Test enhanced prompt generation with history
   - Test failed suggestion context inclusion
   - Test successful suggestion context inclusion

2. **Alternative Suggestions**
   - Test alternative generation after negative feedback
   - Test category-based alternatives
   - Test language-specific alternatives

3. **Response Formatting**
   - Test action verb formatting
   - Test user name inclusion
   - Test language-appropriate prefixes

### Integration Tests

1. **End-to-End Conversation Flow**
   ```typescript
   // Test scenario: User reports back pain, tries suggestion, reports it didn't help
   
   // Step 1: Initial complaint
   await aiService.processWellnessCheckIn("My back hurts", userId);
   // Expected: Suggestion for back pain relief
   
   // Step 2: Negative feedback
   await aiService.processWellnessCheckIn("That didn't help", userId);
   // Expected: Acknowledgment + different approach
   
   // Step 3: Positive feedback
   await aiService.processWellnessCheckIn("Much better, thanks!", userId);
   // Expected: Positive acknowledgment, pattern stored
   ```

2. **Multi-Language Testing**
   - Test Spanish conversation flow
   - Test Chinese conversation flow
   - Test language switching mid-conversation

3. **Session Persistence**
   - Test conversation continuity after 5 minutes
   - Test session timeout after 30 minutes
   - Test storage and retrieval

### Manual Testing Scenarios

1. **Negative Feedback Loop**
   - User: "I have a headache"
   - AI: Suggests breathing exercise
   - User: "Still hurts"
   - AI: Should suggest different approach (not more breathing)

2. **Contextual Awareness**
   - User: "My neck is sore"
   - AI: Suggests neck stretches
   - User: "I tried that already"
   - AI: Should acknowledge and pivot

3. **Emotional State Recognition**
   - User: "I'm so stressed and nothing is working!"
   - AI: Should recognize frustration and adapt tone

4. **Time-Based Context**
   - Morning: Energy-boosting suggestions
   - Afternoon: Focus and alertness tips
   - Evening: Relaxation and wind-down

## Phase 2: Memory Consolidation Testing

### Migration Testing
1. **Data Integrity**
   - Verify all user data migrates correctly
   - Test confidence score preservation
   - Test pattern history migration

2. **Backward Compatibility**
   - Test with existing user data
   - Verify no data loss
   - Test fallback mechanisms

3. **Performance Testing**
   - Measure memory operation speed
   - Test with large datasets
   - Monitor storage usage

## Phase 3: Integration Testing

### API Integration
1. **OpenRouter Integration**
   - Test with actual API calls
   - Test token usage with enhanced context
   - Test response time

2. **Rate Limiting**
   - Test with conversation context overhead
   - Verify limits still enforced
   - Test premium vs free limits

3. **Error Handling**
   - Test API failures mid-conversation
   - Test storage failures
   - Test recovery mechanisms

### User Experience Testing

1. **Response Quality**
   - A/B test old vs new system
   - Measure user satisfaction
   - Track suggestion effectiveness

2. **Edge Cases**
   - Very short responses ("no", "yes")
   - Very long responses (over token limit)
   - Mixed language input
   - Emoji and special characters

3. **Performance Metrics**
   - Response generation time
   - Context building overhead
   - Storage read/write performance

## Test Data Sets

### Conversation Scenarios
```javascript
const testScenarios = [
  {
    name: "Negative Feedback Recovery",
    messages: [
      { role: "user", content: "My lower back is killing me" },
      { role: "assistant", content: "Try this: Stand up and do gentle back stretches" },
      { role: "user", content: "I tried but it still hurts" },
      // Expected: Different approach, not more stretching
    ]
  },
  {
    name: "Building on Success",
    messages: [
      { role: "user", content: "Feeling stressed" },
      { role: "assistant", content: "Take 5 deep breaths" },
      { role: "user", content: "That helped a bit" },
      { role: "user", content: "Still a little tense though" },
      // Expected: Build on breathing, add complementary technique
    ]
  },
  {
    name: "Language Detection",
    messages: [
      { role: "user", content: "Me duele la espalda" },
      // Expected: Spanish response
      { role: "user", content: "Still hurts" },
      // Expected: Continue in Spanish or switch to English?
    ]
  }
];
```

## Success Criteria

1. **Conversation Context**
   - 90%+ sentiment detection accuracy
   - 100% alternative suggestions after negative feedback
   - 80%+ user satisfaction with contextual responses

2. **Memory System**
   - Zero data loss during migration
   - <100ms memory operation time
   - 30% reduction in storage usage

3. **Overall System**
   - 95%+ uptime
   - <2s response time
   - 20% improvement in user engagement

## Testing Tools

1. **Jest** - Unit testing
2. **React Native Testing Library** - Component testing
3. **Detox** - E2E testing (if applicable)
4. **Manual QA** - User experience validation

## Testing Schedule

- **Week 1**: Unit tests for conversation manager
- **Week 2**: Integration tests and manual testing
- **Week 3**: Memory consolidation and migration
- **Week 4**: Full system testing and optimization