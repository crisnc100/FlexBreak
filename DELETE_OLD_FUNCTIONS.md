# Deleting Old Firebase Functions

Before deploying the updated functions, you need to delete the old AI-related functions that no longer exist in the codebase.

## Option 1: Delete specific functions (Recommended)

Run these commands to delete the AI-related functions:

```bash
firebase functions:delete handleAINotificationResponse --force
firebase functions:delete handleAINotificationResponseHTTP --force
firebase functions:delete testAIFunction --force
firebase functions:delete testExpoNotification --force
```

## Option 2: Delete all functions and redeploy

If Option 1 doesn't work, you can delete all functions and redeploy:

```bash
# List all functions
firebase functions:list

# Delete all functions (be careful!)
firebase functions:delete --force
```

## After deletion, deploy the updated functions:

```bash
firebase deploy --only functions
```

## Alternative: Deploy with --force flag

You can also try deploying with the force flag:

```bash
firebase deploy --only functions --force
```