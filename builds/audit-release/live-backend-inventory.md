# Live backend evidence — September 10, 2026

Read-only browser inspection used the authenticated personal owner account. No deployments, rules publication, secret rotations or data deletion occurred.

- Firebase project `flexbreak-28ad0`: published Firestore rules July 18, 2025 08:58 show unrestricted reads/writes to `fcm_tokens`, `user_reminders`, `verifiedEmails`, `oneTimeCodes`, **and `premiumUsers`**. All other paths denied. The fifth collection was absent from checked-in rules.
- Firebase Authentication currently shows **Get started**. Anonymous sign-in must be enabled before deploying clients that require Firebase ID tokens. No sign-in provider changed.
- Six Firebase functions remain deployed: `aiChat`, `transcribeAudio`, `verifyOfficeWorkerEmail`, `saveUserReminders`, `helloWorld`, `sendPersonalReminders`. First five showed zero requests in prior 24h; scheduled reminder showed1439. Zero recent requests is not proof no old client uses them.
- `sendPersonalReminders` deployed July21,2025 uses Node20. Google Cloud console warns runtime deprecated April30,2026 and decommission October30,2026. Deployed source recovered through Cloud Run Source/Download archive, inspected under ignored `.artifacts/deployed/firebase/src`; source archive restricted to local owner permissions. Archive also contains provider credentials; never commit or share it.
- Cloud Run Logs filtered by `Error sending personal reminders` displayed repeated `messaging/invalid-argument` failures stating the registration token is not a valid FCM registration token. This confirms actual delivery failures, not just a source-level incompatibility. The unfiltered current minute logged zero successful personal reminders; this does not establish zero sends across all history.
- Deployed sender uses `admin.messaging().send` on reminder token. Current and prior app obtain Expo push tokens. Fixing sender to deliver Expo pushes would duplicate existing local schedules and duplicate legacy/new identity documents. New client therefore installs repeating local reminders and writes no remote reminder/token records. Retirement requires reviewing real token types/logs first; no live sender changed.
- Supabase project `tkudukjujfztyiqijvjn` (`FlexBreak-App`, FlexBreak PRO org) owns six prior functions: ai-chat-firebase, ai-chat, transcribe-audio, verify-email, save-reminders, hello-world. Deployed sources recovered through dashboard downloads. Versioned replacements and legacy containment are in `supabase/`.
- Provider-key-looking secret in historical public debug output remains a rotation task; its exact locator is retained only in ignored local security notes. Comparison found no exact match against provider values in recovered Firebase archive; current validity and Supabase reuse are unverified. Never invoke leaked credentials as a test.
- Google Cloud/Firebase CLIs have work accounts only; personal browser access does not establish deployment CLI authentication. No work-account token used against this personal project.

Firebase console: https://console.firebase.google.com/u/2/project/flexbreak-28ad0/overview
Supabase dashboard: https://supabase.com/dashboard/project/tkudukjujfztyiqijvjn

## Reviewable retirement operation (not executed)

Before retirement, inspect function invoker traffic across a representative period and inspect stored token formats without exporting tokens. Confirm no supported app calls old Firebase HTTP endpoints and no valid FCM-only installations depend on the sender. Then Cris can approve removal of the six named functions in us-central1, including their associated scheduler. Preserve provider keys in Supabase secret management and rotate historical compromised credentials; deleting endpoint source alone does not revoke keys. Never run a bare Firebase deploy against stale/missing functions configuration. Rules rollout is separate and must use the compatibility phase first.
