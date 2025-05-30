# How to Get Your Expo Token for GitHub Actions

## Your Project Information
- **Project ID**: `e2f2f0ca-229d-4469-9de8-9f69b7f7a724`
- **Username**: `crisnc100`

## Getting Your Expo Token

### Option 1: Using Expo Website (Recommended)
1. Go to https://expo.dev/
2. Log in with your account (crisnc100)
3. Click on your profile icon (top right)
4. Go to "Account Settings"
5. Navigate to "Access Tokens"
6. Click "Create Token"
7. Give it a name like "GitHub Actions"
8. Copy the token (it will only be shown once!)

### Option 2: Using EAS CLI
```bash
# First, ensure you're logged in
npx eas login

# Then create a token
npx eas account:view
```

### Option 3: Using Expo CLI (if available)
```bash
# Install expo CLI globally if needed
npm install -g expo-cli

# Login
expo login

# Get token
expo token:create
```

## Setting Up GitHub Secrets

Once you have your token, add these secrets to your GitHub repository:

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Add these secrets:

```
EXPO_TOKEN = (your expo access token from above)
EAS_PROJECT_ID = e2f2f0ca-229d-4469-9de8-9f69b7f7a724
```

## Verifying Your Setup

After adding the secrets, you can verify they're working by:
1. Triggering a GitHub Action workflow
2. Checking the logs to ensure authentication succeeds

## Security Notes
- Never commit your token to the repository
- Rotate tokens periodically
- Use minimal permissions needed for CI/CD 