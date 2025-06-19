# AI Wellness Coach Testing Checklist

## Pre-Testing Setup
- [ ] Ensure you have access to OpenRouter API
- [ ] Test on both iOS and Android devices
- [ ] Have both free and premium test accounts ready
- [ ] Clear all previous test data before starting

## 1. Initial Setup Testing
- [ ] Enable AI Wellness Coach in settings as free user
- [ ] Verify notification permission prompt appears
- [ ] Check that Wednesday-only message shows for free users
- [ ] Enable as premium user and verify daily access message

## 2. Notification Flow Testing

### Free User - Wednesday
- [ ] Receive check-in notification at 2 PM
- [ ] Tap notification and see text input field
- [ ] Type "Hello" and submit
- [ ] Receive name collection prompt
- [ ] Provide name and receive personalized greeting
- [ ] Report wellness issue (e.g., "My back hurts")
- [ ] Receive AI suggestion with specific action
- [ ] Wait 30 minutes for effectiveness check
- [ ] Test all three effectiveness options (Yes/Somewhat/No)

### Free User - Usage Limits
- [ ] Try second conversation on same Wednesday
- [ ] Verify usage limit message appears
- [ ] Check upgrade prompt notification shows
- [ ] Tap "Upgrade to Premium" button
- [ ] Verify subscription modal opens

### Free User - Non-Wednesday
- [ ] Try to use on Tuesday/Thursday
- [ ] Verify Wednesday-only message appears
- [ ] Check upgrade prompt shows correct messaging

### Premium User Testing
- [ ] Test on any day of the week
- [ ] Verify unlimited conversations work
- [ ] Test multiple conversations in one day
- [ ] Verify no limit messages appear

## 3. Edge Cases & Error Testing

### Network Issues
- [ ] Turn off internet and try to send message
- [ ] Verify fallback response appears
- [ ] Test with slow connection (3G)
- [ ] Check timeout handling (30s limit)

### Notification Permissions
- [ ] Disable notifications in system settings
- [ ] Try to enable AI Wellness
- [ ] Verify appropriate error message

### Data Persistence
- [ ] Have conversation and force quit app
- [ ] Reopen and verify name is remembered
- [ ] Check conversation history persists
- [ ] Verify effectiveness data is retained

### Background Behavior
- [ ] Send notification response with app closed
- [ ] Verify AI response notification appears
- [ ] Check effectiveness notification while backgrounded
- [ ] Test with Do Not Disturb mode on

## 4. Content Quality Testing

### AI Response Quality
- [ ] Test various wellness issues:
  - Back pain
  - Neck strain
  - Eye fatigue
  - Stress/anxiety
  - Lack of focus
  - General tiredness
- [ ] Verify responses are:
  - Under 50 words
  - Specific and actionable
  - Desk-friendly suggestions
  - Encouraging tone

### Personalization
- [ ] Verify name is used naturally (not every message)
- [ ] Check morning/afternoon/evening context works
- [ ] Test effectiveness tracking improves suggestions
- [ ] Verify repeated issues get better responses

## 5. Performance Testing

### Response Times
- [ ] Measure time from submission to AI response
- [ ] Should be < 3 seconds on good connection
- [ ] Test with multiple concurrent users

### Storage Usage
- [ ] Check storage after 50 conversations
- [ ] Verify old conversations are pruned
- [ ] Monitor AsyncStorage size

### Battery Impact
- [ ] Monitor battery usage during active day
- [ ] Check background notification impact

## 6. Integration Testing

### Premium Flow
- [ ] Test upgrade from limit reached notification
- [ ] Verify premium status updates immediately
- [ ] Check daily notifications start next day
- [ ] Test downgrade scenario

### Settings Integration
- [ ] Toggle on/off rapidly
- [ ] Verify notifications schedule/cancel properly
- [ ] Check name edit/delete in AI settings
- [ ] Test with other app features active

## 7. Beta Testing Preparation

### Test User Profiles
1. **Office Worker** - Sits all day, back/neck issues
2. **Remote Worker** - Irregular schedule, stress
3. **Active User** - Uses app features heavily
4. **Casual User** - Minimal interaction
5. **Premium User** - Tests full features

### Metrics to Track
- Response rate to notifications
- Effectiveness feedback distribution
- Most common wellness issues
- Average conversations per user
- Upgrade conversion rate
- API costs per user

## 8. API Cost Monitoring

### During Testing
- [ ] Track tokens used per conversation
- [ ] Monitor daily API costs
- [ ] Calculate average cost per user
- [ ] Identify expensive edge cases
- [ ] Optimize prompt lengths if needed

### Cost Projections
- Free user: 2 chats/week = ~$0.001/week
- Premium user: 7 chats/week = ~$0.004/week
- Target: < $0.02/user/month

## 9. Launch Readiness Checklist

### Documentation
- [ ] User guide written
- [ ] FAQ section complete
- [ ] Privacy policy updated
- [ ] Support documentation ready

### Monitoring
- [ ] Error tracking configured
- [ ] Usage analytics set up
- [ ] Cost alerts configured
- [ ] User feedback system ready

### Rollout Plan
- [ ] Soft launch to 10% of users
- [ ] Monitor for 1 week
- [ ] Address any issues
- [ ] Full rollout

## Testing Log Template

```
Date: ___________
Tester: _________
Device: _________
OS Version: _____

Test Scenario: ________________

Steps:
1. ____________________
2. ____________________
3. ____________________

Expected Result: ______________
Actual Result: _______________
Pass/Fail: __________________

Notes: _____________________
```

## Known Issues to Verify Fixed
- [x] Notification spam (fixed with repeats: false)
- [x] Multiple check-ins on toggle (fixed with debouncing)
- [x] Wednesday/Friday vs Wednesday only (updated)
- [ ] Text input on older iOS versions
- [ ] Android notification channels

## Post-Launch Monitoring
- User engagement rate (target: >40%)
- Effectiveness "Yes" rate (target: >70%)
- API error rate (target: <1%)
- Average response time (target: <3s)
- Cost per user (target: <$0.02/month)