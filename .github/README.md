# GitHub Actions CI/CD Setup 🚀

## Quick Start

### 1. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
```
EXPO_TOKEN = (your expo access token)
EAS_PROJECT_ID = (your eas project id)
SLACK_WEBHOOK_URL = (optional - for notifications)
```

### 2. Get Your Tokens

```bash
# Get EXPO_TOKEN
npx expo login
npx expo whoami --json
# Copy the "accessToken" value

# Get EAS_PROJECT_ID
npx eas project:info
# Copy the "projectId" value
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Branches

```bash
git checkout -b develop
git push -u origin develop

git checkout -b staging
git push -u origin staging
```

## Workflow Summary

| Branch | Trigger | Actions | Output |
|--------|---------|---------|--------|
| `develop` | Push | Lint, Type Check, Tests, Build | Development builds |
| `staging` | Push | All checks + Version bump (patch) | TestFlight & Android preview |
| `main` | Push | All checks + Security scan + Version bump (minor) | App Store & Play Store |

## Your New Workflow

Instead of running:
```bash
npx eas-cli build --platform ios --profile testflight --clear-cache --non-interactive --no-wait
```

Just:
```bash
git push origin staging
```

Everything happens automatically! 🎉

## Version Management

- **Staging**: Increments patch version (1.0.0 → 1.0.1)
- **Production**: Increments minor version (1.0.1 → 1.1.0)
- Build numbers auto-increment on every build
- Git tags created for production releases

## Monitoring

- Check GitHub Actions tab for build progress
- Slack notifications (if configured)
- EAS dashboard for detailed build logs

## Troubleshooting

If builds fail:
1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. Check EAS dashboard for detailed errors
4. Ensure `eas.json` has correct profiles

## Next Steps

1. ✅ Commit these workflow files
2. ✅ Add your GitHub secrets
3. ✅ Push to `develop` to test
4. ✅ Celebrate automation! 🎉