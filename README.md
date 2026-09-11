# FlexBreak

FlexBreak is a mobile stretching app for people who spend their day at a desk. It helps users fit guided movement into their workday, build consistent habits, and track their progress.

## The app

- Guided stretching routines with demonstration videos, previews and timers.
- Favorites and playlists for frequently used routines.
- XP, streaks, challenges, achievements and rewards.
- Flex Coach: text and voice conversations, with coach-created routines.
- Break reminders, weather-aware features, ads and subscriptions.

The client is built with Expo, React Native and TypeScript. App data is stored locally with AsyncStorage; Firebase provides identity and supports backend data storage. Authenticated Supabase functions handle remote services and enforce purchase verification and quotas. Coach, transcription, weather and subscription verification require network access.

## Develop locally

Use **Node 22** and work in a task worktree, not the trunk checkout.

```sh
npm ci
npm start
```

`npm start` starts Expo. Native integrations such as purchases and ads require a development/native build rather than relying on Expo Go. With the appropriate native toolchain installed, `npm run ios` and `npm run android` build and run locally. For a signed iPhone build, see [deployment](docs/RELEASING.md).

Provider credentials and service-account secrets belong in backend secret configuration. Do not add them to mobile build variables or copy server-secret templates into the app.

## Check changes

```sh
npm run lint
npm run type-check
npm test
npm run verify
```

`verify` combines the first three checks with iOS and Android JavaScript exports. Full [GitHub CI](.github/workflows/ci.yml) additionally checks dependency audits, the Deno backend, and Firestore rules against an emulator. Native device and store-purchase testing remain separate checks.

## Repository map

| Location | Purpose |
| --- | --- |
| `App.tsx`, `src/screens`, `src/components` | Navigation, screens and UI |
| `src/data`, `assets` | Stretch catalogs, content and media |
| `src/services`, `src/hooks`, `src/utils` | App behavior and integrations |
| `src/context`, `src/state` | Shared state and Redux streak store |
| `supabase/functions`, `supabase/tests` | Authenticated backend and tests |
| `tests`, `security-tests/firestore` | App, release automation and rules tests |
| `scripts`, `.github/workflows` | Build, checks and deployment automation |
| `docs` | Setup and operational guides |

## Test and ship

For iPhone testing: **GitHub Actions → Build and upload to TestFlight → Run workflow → main**. The workflow runs CI, builds the exact main revision and uploads it to Apple. Wait for Apple processing, then use the existing TestFlight tester setup.

The existing automatic production workflow remains gated on release qualification. TestFlight upload does not submit the app for public App Review. Android store release is currently deferred.

- [Short deployment steps](docs/RELEASING.md)
- [CI, signing and release qualification](docs/CI_CD_SETUP_GUIDE.md)
- [Backend deployment and recovery](docs/BACKEND_DEPLOYMENT.md)
- [Privacy policy](https://flexbreak-privacy-app.netlify.app/)

Agents should read [AGENTS.md](AGENTS.md) and the lean [project overview](CLAUDE.md).
