# GitHub automation

`workflows/iphone-testflight.yml` runs **Build and upload to TestFlight** after every main push, including docs/tests-only changes, with a fresh manual dispatch available for retries. It runs full reusable CI, builds a production iOS artifact and uploads that exact validated build to Apple. Apple processing and tester setup follow. No backend deployment, production checkpoint advancement or public App Review happens here.

`workflows/auto-production.yml` is **Production deployment (manual)**. It runs only by explicit dispatch and remains gated on qualification. Its cumulative planner, complete preflight, backend-before-mobile order and deployment history are unchanged. Backend deployment is now dispatch-only. Restoring automatic production later requires a reviewed workflow change.

`workflows/ci.yml` independently checks PRs and staging/develop pushes. Main invokes it through TestFlight. Checks include lint, app/backend typechecking and tests, audits, mobile bundles and Firestore emulator policies. CI receives no deployment secrets.

TestFlight, preview and production share a non-cancelling queue. A new pending run can replace another pending run. Check pending work before dispatching production; use a fresh Run workflow if the intended run is cancelled. Re-run jobs is rejected.

`workflows/deploy-backend.yml` is manual legacy containment only, using a separate queue. No workflow automatically publishes a public store release, changes rules/secrets or deletes remote functions.

See [short deployment steps](../docs/RELEASING.md), [production setup](../docs/CI_CD_SETUP_GUIDE.md), and [backend operations](../docs/BACKEND_DEPLOYMENT.md). Protect main; without optional environment reviewers, merging authorizes the automatic TestFlight build/upload.
