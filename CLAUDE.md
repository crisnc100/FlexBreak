# FlexBreak — project context

FlexBreak helps desk workers take stretching breaks. The mobile app combines guided video routines and timers with favorites, playlists, XP, streaks, challenges and rewards. Flex Coach supports text/voice conversations and routine creation. Reminders, weather, ads and subscriptions round out the experience.

## How it works

- Expo / React Native / TypeScript client. `App.tsx` wires navigation and providers; `src/screens` and `src/components` contain the UI. Shared state uses contexts and a Redux streak store.
- `src/data` and `assets` hold catalogs and media. `src/services`, hooks and utilities implement routines, progress and integrations. AsyncStorage persists local app data.
- Firebase supplies persistent anonymous identity. The client sends Firebase ID tokens to allowlisted Supabase v2 functions for coach chat, transcription, weather, email verification, code redemption and purchase verification.
- The backend holds provider credentials, verifies store purchases and enforces access/quotas. Local premium flags do not authorize paid backend access. Network features are not fully offline.

## Working here

Follow [AGENTS.md](AGENTS.md), including its standing permission to commit validated requested work and open a PR. Cris alone merges. Use Node 22, `npm ci`, then `npm start`; native integrations need a development/native build. `npm run verify` runs app lint, type-check, tests and mobile exports. CI also checks the Deno backend and Firestore emulator policies.

For deployment, use [the short release guide](docs/RELEASING.md). The manual TestFlight workflow automates CI, a production iOS build and exact-artifact upload. Apple processing and public release are separate. iOS is the current release focus; Android store release is deferred. Do not infer readiness from old handoffs—check current gates and evidence.

See [README.md](README.md) for the repository map and [backend deployment](docs/BACKEND_DEPLOYMENT.md) for server operations. Keep this file an overview, not a session log.
