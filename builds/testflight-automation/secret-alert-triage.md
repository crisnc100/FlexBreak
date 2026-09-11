# Secret-scanning assessment — September 11, 2026

Read-only assessment of the five open GitHub alerts. No alert was closed and no credential was rotated or revoked. Removing a value from the current tree does not remove it from Git history or deactivate it at its provider.

| Alert | Evidence observed | Disposition |
| --- | --- | --- |
| #1 Google/Firebase client key | Matches current firebase.config.js. Google metadata shows a non-deleted Firebase-created iOS key with a broad Firebase/Google API allowlist. | Firebase client keys are normally public configuration, not server credentials. Review restrictions before choosing an appropriate GitHub resolution; no blanket harmlessness claim. Do not revoke the app's current key blindly. |
| #2 old Firebase key | Absent from current tracked files. Firebase public project-configuration read returned API_KEY_INVALID. Google key-owner lookup was permission denied. | Currently rejected by Firebase. Inactive-key evidence supports closure after owner confirms retirement; do not call the original detection a false positive. |
| #3 old Firebase key | Absent from current tracked files. Firebase public project-configuration read returned API_KEY_INVALID. Google key-owner lookup was permission denied. | Same as #2. |
| #4 OpenRouter key | Exposed in historical functions/firebase-debug.log, absent from current tracked files. Read-only current-key API returned HTTP 401. Does not match the SHA-256 digest of the stored Supabase OPENROUTER_API_KEY in the September 11 inventory. | Currently rejected. Confirm provider retirement/revocation before resolving as revoked; it was a real credential disclosure, not a false positive. No paid inference was performed. |
| #5 Google Speech key | Exposed in historical functions/setup-env.sh. Google key metadata is readable, has no deleteTime, and allows speech.googleapis.com. No client/IP restriction appears. Does not match the stored Supabase GOOGLE_SPEECH_API_KEY digest in the September 11 inventory. | Keep open. Active credential exposure requiring owner-authorized revocation/rotation and a check for legacy consumers. Different current backend digest does not prove there are no other consumers. No speech request was made. |

Provider values never appeared in tool output, this report, or the PR. Local ignored evidence records contain only sanitized metadata. Provider read results are point-in-time observations, not proof of historical usage or absence of abuse.

References: [Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys), [Google API key restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys), [OpenRouter rotation](https://openrouter.ai/docs/cookbook/administration/api-key-rotation).
