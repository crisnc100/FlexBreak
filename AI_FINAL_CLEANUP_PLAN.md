# AI Services Final Cleanup & Organization Plan

## Current State: 22+ Files (Too Many!)

## Target Structure: ~10-12 Well-Organized Files

```
src/services/ai/
├── core/
│   ├── aiWellnessService.ts      (main service - merge V1 & V2)
│   ├── conversationManager.ts    (existing)
│   └── promptManager.ts          (existing + templates + formatter)
├── memory/
│   └── memoryService.ts          (improvedMemory only)
├── integrations/
│   ├── openRouterService.ts     (API integration)
│   ├── googleSpeechService.ts   (speech API)
│   └── voiceRecordingService.ts (audio handling)
├── scheduling/
│   ├── notificationScheduler.ts  (merge scheduler + messages)
│   └── notificationDebouncer.ts  (keep as-is)
├── utils/
│   ├── reliabilityService.ts    (merge error + retry + rate limiter)
│   ├── costMonitor.ts           (keep as-is)
│   └── contextBuilder.ts        (temporary - move functions later)
└── config/
    └── systemInitializer.ts      (merge initializers)
```

## Immediate Actions (Safe to Do Now)

### 1. Delete These Files (No Longer Needed):
```bash
# Already migrated to improvedMemory
rm src/services/ai/wellnessMemory.ts

# Old version (keep V2)
rm src/services/ai/aiWellnessService.ts

# Duplicate initializer
rm src/services/ai/aiWellnessInitializer.ts

# No longer needed after migration
rm src/services/ai/memoryMigration.ts
rm src/services/ai/simpleMemory.ts

# Merged into promptManager
rm src/services/ai/promptTemplates.ts
rm src/services/ai/responseFormatter.ts
```

### 2. Rename Files:
```bash
# Use V2 as main service
mv src/services/ai/aiWellnessServiceV2.ts src/services/ai/core/aiWellnessService.ts

# Better names
mv src/services/ai/aiWellnessSchedulerV2.ts src/services/ai/scheduling/notificationScheduler.ts
mv src/services/ai/improvedMemory.ts src/services/ai/memory/memoryService.ts
```

### 3. Create Merged Files:

#### A. `utils/reliabilityService.ts` (Merge 3 files)
Combine:
- errorHandler.ts
- retryUtil.ts  
- rateLimiter.ts

#### B. `scheduling/notificationScheduler.ts` (Merge 2 files)
Combine:
- aiWellnessSchedulerV2.ts
- notificationMessages.ts

### 4. Move Files to Proper Locations:
```bash
# Create directories
mkdir -p src/services/ai/{memory,integrations,scheduling,utils,config}

# Move files
mv src/services/ai/openRouterService.ts src/services/ai/integrations/
mv src/services/ai/googleSpeechService.ts src/services/ai/integrations/
mv src/services/ai/voiceRecordingService.ts src/services/ai/integrations/
mv src/services/ai/costMonitor.ts src/services/ai/utils/
mv src/services/ai/notificationDebouncer.ts src/services/ai/scheduling/
```

## File Count Reduction

**Before**: 22+ files
**After**: 12 files

**Reduction**: 45% fewer files!

## Import Updates Required

### Update These Import Paths:
```typescript
// Old
import aiWellnessService from './services/ai/aiWellnessService';
import improvedMemory from './services/ai/improvedMemory';
import { errorHandler } from './services/ai/errorHandler';

// New
import aiWellnessService from './services/ai/core/aiWellnessService';
import memoryService from './services/ai/memory/memoryService';
import { reliabilityService } from './services/ai/utils/reliabilityService';
```

## Benefits

1. **Clearer Organization**: Related files grouped together
2. **Easier Navigation**: Know exactly where to find things
3. **Less Duplication**: Merged similar functionality
4. **Better Naming**: Clear, descriptive file names
5. **Maintainable**: Easier to understand and modify

## Order of Operations

1. **First**: Create directories
2. **Second**: Move files that don't need changes
3. **Third**: Create merged files (reliabilityService)
4. **Fourth**: Delete old files
5. **Fifth**: Update all imports
6. **Sixth**: Test everything

Ready to proceed?