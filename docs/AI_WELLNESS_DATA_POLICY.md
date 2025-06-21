# FlexBreak AI Wellness Data Retention Policy

## Overview
This document outlines how FlexBreak handles data collected through the AI Wellness Coach feature, ensuring compliance with privacy regulations and user trust.

## Data Collection

### What We Collect
1. **Conversation History**: User inputs and AI responses during wellness check-ins
2. **Usage Metrics**: Daily interaction counts and timestamps
3. **Effectiveness Tracking**: User feedback on suggested wellness actions
4. **User Preferences**: Personalized patterns and action effectiveness scores

### What We DON'T Collect
- Health records or medical information
- Location data
- Biometric data
- Third-party app data

## Retention Periods

| Data Type | Retention Period | Reason |
|-----------|------------------|---------|
| Conversation History | 90 days | Provide personalized responses based on recent context |
| Usage Metrics | 180 days | Monitor feature usage and enforce fair use limits |
| Effectiveness Data | 365 days | Improve recommendation quality over time |
| Anonymous User Data | 30 days | Limited retention for non-authenticated users |

## User Rights

### 1. Right to Access
Users can request a complete export of their AI Wellness data at any time through:
- Settings > AI Wellness > Export My Data
- Programmatically via `dataRetentionService.exportUserData(userId)`

### 2. Right to Deletion
Users can delete their data:
- **Partial Deletion**: Delete specific data types (conversations, metrics, etc.)
- **Complete Deletion**: Remove all AI Wellness data
- **Grace Period**: 30-day recovery period after deletion request

### 3. Right to Portability
Data exports are provided in standard JSON format, making it easy to:
- Review personal data
- Transfer to other services
- Keep personal records

### 4. Right to Correction
Users can update their preferences and correct data through the app interface.

## Data Security

### Storage
- All data stored locally on device using AsyncStorage
- No server-side storage of conversation content
- Encrypted at rest by iOS/Android OS

### Processing
- OpenRouter API processes queries but doesn't store conversation history
- No personally identifiable information sent to AI models
- User IDs are anonymized before any external processing

## Automated Cleanup

### Daily Cleanup Process
- Runs automatically at 3 AM local time
- Removes data older than retention periods
- Maintains app performance by limiting data growth

### Manual Cleanup
Users can trigger immediate cleanup through:
- Settings > AI Wellness > Clear Old Data
- Automatic cleanup on app updates

## Implementation

### For Developers
```typescript
// Export user data
const userData = await dataRetentionService.exportUserData(userId);

// Delete specific data type
await dataRetentionService.deleteUserData(userId, DATA_TYPES.CONVERSATIONS);

// Delete all user data
await dataRetentionService.deleteUserData(userId, DATA_TYPES.ALL);

// Get retention policy details
const policy = dataRetentionService.getRetentionPolicy();
```

### Scheduled Cleanup
The app automatically schedules data cleanup:
```typescript
await scheduleDataRetentionCleanup();
```

## Compliance

### GDPR Compliance
- ✅ Explicit consent required to enable AI Wellness
- ✅ Clear data retention periods
- ✅ User data export functionality
- ✅ Right to erasure implementation
- ✅ Data minimization practices

### CCPA Compliance
- ✅ Transparent data collection notices
- ✅ Opt-out mechanisms
- ✅ No sale of personal information
- ✅ Equal service regardless of privacy choices

## Updates to This Policy

- Version: 1.0
- Last Updated: January 21, 2025
- Changes will be communicated through app updates
- Users will be prompted to review significant changes

## Contact

For privacy-related questions or data requests:
- Email: privacy@flexbreak.app
- In-app: Settings > Help & Support > Privacy Questions

## Developer Notes

### Testing Data Retention
```bash
# Manually trigger cleanup (development only)
await dataRetentionService.performDataCleanup();

# Check retention status
const stats = await AsyncStorage.getAllKeys();
const aiKeys = stats.filter(k => k.includes('ai_wellness'));
console.log(`AI Wellness data keys: ${aiKeys.length}`);
```

### Monitoring
- Log cleanup operations for audit trail
- Monitor data growth trends
- Alert on cleanup failures
- Track user data requests