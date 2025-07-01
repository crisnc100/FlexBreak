# AI System File Cleanup Analysis

## Current File Count: 25+ files in AI system

### Redundant Files to Remove

#### Memory Systems (Keep only 1)
- **KEEP**: `improvedMemory.ts` (313 lines) - Most sophisticated
- **DELETE**: 
  - `simpleMemory.ts` (239 lines) - Outdated
  - `wellnessMemory.ts` (235 lines) - Duplicate functionality
  - `memoryMigration.ts` (93 lines) - Move logic into improvedMemory

**Savings**: ~567 lines, 3 files

#### Consolidation Opportunities

**1. Context & Conversation (Merge into conversationManager.ts)**
- `contextBuilder.ts` (161 lines)
- Add new conversation tracking logic
- **Result**: 1 file instead of scattered logic

**2. Prompts & Formatting (Merge into promptManager.ts)**
- `promptTemplates.ts` (104 lines)
- `responseFormatter.ts` (unknown lines)
- **Result**: Unified prompt management

**3. Error & Retry (Merge into reliabilityManager.ts)**
- `errorHandler.ts` (347 lines)
- `retryUtil.ts` (242 lines)
- **Result**: 589 lines → ~400 lines (remove duplication)

**4. Schedulers (Keep separate but organize)**
- Move to `scheduling/` subdirectory
- Keep `aiWellnessSchedulerV2.ts` as main scheduler
- `notificationDebouncer.ts` - utility file

### Proposed New Structure

```
src/services/ai/
├── core/                          (Core business logic)
│   ├── aiWellnessService.ts      (Main service)
│   ├── conversationManager.ts     (NEW: Context + History)
│   ├── promptManager.ts          (NEW: Dynamic prompts)
│   └── openRouterService.ts      (API integration)
│
├── memory/                        (User data persistence)
│   └── memoryService.ts          (Consolidated from 4 files)
│
├── reliability/                   (Error handling & limits)
│   ├── reliabilityManager.ts     (NEW: Errors + Retry)
│   ├── rateLimiter.ts           (Keep as-is)
│   └── costMonitor.ts           (Keep as-is)
│
├── scheduling/                    (Notifications)
│   ├── notificationScheduler.ts  (Rename from V2)
│   ├── notificationMessages.ts   (Keep as-is)
│   └── notificationDebouncer.ts  (Keep as-is)
│
├── config/                        (System configuration)
│   ├── configValidator.ts        (Keep as-is)
│   └── systemInitializer.ts      (Keep as-is)
│
├── voice/                         (Voice features)
│   ├── voiceRecordingService.ts  (Keep as-is)
│   └── googleSpeechService.ts    (Keep as-is)
│
└── utils/                         (Testing & helpers)
    ├── aiTestingUtils.ts         (Keep for dev)
    └── costTracker.ts            (Legacy, mark deprecated)
```

### Files to Delete/Archive

1. **Immediate Deletion** (Redundant):
   - `simpleMemory.ts`
   - `wellnessMemory.ts` 
   - `memoryMigration.ts`
   - `aiWellnessInitializer.ts` (duplicate of systemInitializer)

2. **Archive** (Legacy but may have references):
   - `costTracker.ts` (replaced by costMonitor)
   - `promptTemplates.ts` (after migration)
   - `contextBuilder.ts` (after migration)

### Migration Steps

1. **Phase 1: Memory Consolidation**
   ```bash
   # Create new unified memory service
   cp improvedMemory.ts memory/memoryService.ts
   # Add migration logic from memoryMigration.ts
   # Update all imports
   ```

2. **Phase 2: Context Enhancement**
   ```bash
   # Create conversation manager
   # Merge contextBuilder logic
   # Add session tracking
   ```

3. **Phase 3: Reliability Consolidation**
   ```bash
   # Merge error and retry logic
   # Remove duplicate code
   # Simplify interfaces
   ```

### Expected Results

- **File Reduction**: 25 files → 16 files (36% reduction)
- **Code Reduction**: ~800 lines removed (duplicates)
- **Better Organization**: Clear subdirectories by function
- **Easier Maintenance**: Related code together
- **Improved Performance**: Less import overhead

### Backup Strategy

```bash
# Before cleanup
git checkout -b ai-cleanup-backup
git add .
git commit -m "Backup before AI system cleanup"

# Create archive directory
mkdir src/services/ai/_archive
# Move old files there first
```

### Testing After Cleanup

1. Run all existing tests
2. Check all import paths
3. Verify no functionality lost
4. Test memory migration
5. Performance benchmarks

### Timeline

- **Day 1**: Backup and memory consolidation
- **Day 2**: Create conversation manager
- **Day 3**: Consolidate error handling
- **Day 4**: Update all imports and test
- **Day 5**: Final cleanup and documentation