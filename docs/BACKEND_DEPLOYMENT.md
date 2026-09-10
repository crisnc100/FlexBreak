# Automatic backend deployment and legacy containment

The initial v2 bootstrap is deployed; runtime and release qualification remain separate. Credential setup and live probe results are tracked in [activation progress](../builds/audit-release/activation-progress.md). After one-time setup and readiness qualification, merging to main runs `auto-production.yml`, full CI, cumulative planning and required preflight. If backend paths were touched since the checkpoint, it redeploys all six named v2 functions to **tkudukjujfztyiqijvjn** before any iOS mobile operations. The first release is Apple-only; Android account setup and uploads are deferred. Backend-only changes do not build mobile. Runtime health is never inferred from a successful deployment command.

## One-time preparation and engineering bootstrap

1. Protect main and restrict GitHub environment **production** to main. Merge is the steady-state approval boundary. Configure no environment reviewers for deployment without a second click; optional reviewers intentionally add a manual pause. These settings were initially absent; PR preparation configured and read back main protection and the main-only production environment without per-deployment reviewers.
2. Create a Supabase management personal access token authorized for the existing project and save it as environment secret `SUPABASE_ACCESS_TOKEN`. This is not an anon/service-role key or database password. Production planning uses only the GitHub token with contents/actions read permission. Reusable CI inherits no secrets; the Supabase token appears only in the backend execution step and the Expo token only in the mobile step.
3. Follow [server configuration](../supabase/README.md#server-configuration-and-least-privilege): enable Firebase anonymous auth for `flexbreak-28ad0`, provision scoped Firebase service-account JSON/base64, OpenRouter/Groq, OpenWeather, Google Speech, ZeroBounce, Apple server API key/issuer/key ID/app ID. The Google Play verification service account and Play-specific setup are deferred until an Android release; Google Speech remains a shared voice-service dependency. Set provider billing caps. Configure sandbox flags only for approved testing. Use the owner's authenticated Supabase secret-management channel; never put values in source, app environment, inputs or logs. The workflow does not set/rotate secrets.
4. Complete staging/physical-device and store verification before opening mobile readiness. Because these tests need v2 deployed, an owner-authorized **one-time engineering bootstrap** is available below, just as native qualification uses separately authorized builds. This is not a permanent alternate workflow or readiness override. Select a reviewed SHA, run the complete CI bar, verify the fixed project/secrets, and obtain authorization for these remote commands before running them.

Bootstrap commands using Supabase CLI **2.117.0** (executed once on September 10, 2026 from reviewed merged source; see activation progress):

```sh
supabase --version
supabase functions deploy ai-chat-v2 --project-ref tkudukjujfztyiqijvjn --use-api --import-map supabase/deno.json
supabase functions deploy transcribe-audio-v2 --project-ref tkudukjujfztyiqijvjn --use-api --import-map supabase/deno.json
supabase functions deploy verify-email-v2 --project-ref tkudukjujfztyiqijvjn --use-api --import-map supabase/deno.json
supabase functions deploy redeem-code-v2 --project-ref tkudukjujfztyiqijvjn --use-api --import-map supabase/deno.json
supabase functions deploy verify-purchase-v2 --project-ref tkudukjujfztyiqijvjn --use-api --import-map supabase/deno.json
supabase functions deploy weather-v2 --project-ref tkudukjujfztyiqijvjn --use-api --import-map supabase/deno.json
```

Run sequentially and stop immediately on failure. Record exact source/deployment evidence; test authentication denials/success, persistent UID, quotas, weather, voice, redemption, deletion and real sandbox purchase/restore/expiry/cancellation before readiness records change. Deployment success does not prove these tests. Firebase gateway JWT verification is intentionally false because each v2 handler verifies Firebase tokens rather than Supabase tokens.

## Automatic operation and recovery

The planner uses the newest verified successful checkpoint and its newer run history of the unique `auto-production.yml` workflow and a reviewed bootstrap SHA; failed/cancelled work does not checkpoint. Planning unions mainline touched paths, so reverting a partially deployed change still redeploys current source even when the endpoint diff is empty. With no successful checkpoint, the explicit reviewed bootstrap provides a conservative full replay without requiring artificial run-number continuity back to run one. Both push and fresh **Run workflow** use identical cumulative semantics. The production job always executes, even for a reported no-op. Full CI and all needed native/service/token/config/version preflight happen before a combined run changes any backend function. Before every deployment/build/submission the authenticated GitHub main tip must still match the immutable checked-out SHA. Stale work fails; it never rolls back or switches source silently.

Backend commands select only those six names, with fixed project and validated endpoint/JWT manifest; no deploy-all, prune, delete, key rotation or Firestore publication occurs. CLI failures stop subsequent functions and mobile work. Success summaries state only which deployment commands completed. If interrupted, earlier functions may already have changed: inspect remote state before a fresh **Run workflow** on main. GitHub **Re-run jobs** is rejected. Retry repeats the complete cumulative plan, potentially including a new iOS upload after an earlier partial iOS failure. See [production checkpoint and store semantics](CI_CD_SETUP_GUIDE.md).

## Legacy containment remains separate and manual

Actions → **Deploy legacy containment only** → **Run workflow** on main deploys exactly `ai-chat-firebase`, `ai-chat`, `transcribe-audio`, `verify-email` after full CI. It has a separate serialized queue, because these names are disjoint from v2; a pending containment run cannot replace pending automatic production work. Legacy source changes never automatically deploy these handlers.

Keep `LEGACY_PROXY_ENABLED` disabled unless the operator explicitly approves a temporary compatibility window. Deploying containment while disabled makes old public handlers fail closed; enabling it retains bounded unauthenticated access and the documented quota-exhaustion risk. The workflow does not change this flag. Review old-client adoption, provider-key rotation and support impact before dispatch. Rules rollout and Firebase function/scheduler retirement are separate operator decisions. Rollback is a separately reviewed main source change and deployment, never an arbitrary SHA or automatic deletion.

Supabase CLI **2.117.0** is pinned and checked ([official release](https://github.com/supabase/cli/releases/tag/v2.117.0)). See Supabase's [deployment guide](https://supabase.com/docs/guides/functions/deploy) and [function configuration](https://supabase.com/docs/guides/functions/function-configuration). GitHub documents [concurrency behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency) and [workflow run metadata](https://docs.github.com/en/rest/actions/workflow-runs).

Backend-only automatic runs preflight their deployment token, manifest and CLI, but do not wait on mobile/native/privacy readiness. This permits backend repairs independently of store qualification. It does not publish or validate the public policy; that owner task remains required and gates mobile uploads.
