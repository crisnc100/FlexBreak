# GitHub automation

`workflows/auto-production.yml` runs full reusable CI after every main push, then automatically redeploys all six v2 backend functions when backend paths were touched before changed mobile builds/uploads. Docs-only cumulative changes report a no-op; backend-only changes do not build mobile. Fresh manual dispatch retries the identical operation; Re-run jobs is rejected.

`workflows/ci.yml` independently checks PRs and staging/develop pushes. Main invokes it once through production. Checks include lint, app/backend typechecking and tests, audits, mobile bundles and real Firestore emulator policies. CI receives no deployment secrets.

`workflows/deploy-backend.yml` is manual legacy containment only, using a separate queue. No workflow automatically publishes a public store release, changes rules/secrets or deletes remote functions.

Automation is prepared but blocked on account/backend/native/device setup and accurate public privacy disclosure. See the [production runbook](../docs/CI_CD_SETUP_GUIDE.md) and [backend bootstrap/containment](../docs/BACKEND_DEPLOYMENT.md). Protect main; without optional environment reviewers, merging is the deployment approval boundary.

`workflows/iphone-testflight.yml` provides **Build and upload to TestFlight → Run workflow** on main for owner-authorized qualification. It runs full CI, then builds and uploads a verified production iOS artifact. It never deploys the backend or advances production checkpoints. The existing automatic production preflight remains blocked until all release evidence is complete. See the [short deployment steps](../docs/RELEASING.md).
