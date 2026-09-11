# Upload to TestFlight with one button

In GitHub, open **Actions → Build and upload to TestFlight → Run workflow**, select **main**, and run it. Full CI runs first, then the workflow builds a production iOS archive and uploads that exact verified build to Apple. Open the TestFlight link in the run summary after Apple finishes processing. Existing tester-group and compliance setup in App Store Connect still applies; upload completion is not a claim that the build is installable yet.

This is the owner-authorized engineering qualification path for testing purchases and other remaining release checks. It does not deploy backend changes, mark release checks complete, invite testers, or submit the app for public review. It uses `EXPO_TOKEN` (already configured as a repository secret; a production environment secret is also supported), production environment `ASC_APP_ID` and `APPLE_TEAM_ID` variables, and existing EAS signing/submission credentials. Token presence is checked before building; expired remote credentials can still fail the run.

Use **Run workflow**, never **Re-run jobs**. A moved main branch is rejected before each remote operation. Before retrying a failed/canceled run, inspect its EAS build and Apple upload to avoid blindly duplicating work. Each fresh run can consume a build number. GitHub can cancel a queued run without producing a summary; the shared queue prevents concurrent release jobs but does not guarantee every pending run executes.

# Build an iPhone preview

In GitHub, open **Actions → Build iPhone Preview → Run workflow**, select **main**, and run it. After CI and the signed build finish, open the build link in the run summary and install it on a registered iPhone. This builds the exact main revision selected when you clicked; if main moves before the build starts, dispatch again from current main.

One-time setup: configure the existing Expo project and production environment `EXPO_TOKEN`, register your iPhone with the intended Apple team (new-device registration may require the agent to run EAS and you to follow its device enrollment link), and prepare ad hoc signing credentials. See [CI and signing setup](CI_CD_SETUP_GUIDE.md). The preview uses the existing production runtime configuration with internal distribution. It does not upload to TestFlight, release publicly, or change readiness gates.

TestFlight, preview and automatic production runs share one queue so they cannot race remote build numbers. GitHub can replace a pending run; an active run is not automatically canceled. If a preview replaces a queued production run, use a fresh **Automatic production deployment → Run workflow** on main after the active run finishes (or the next main push will trigger it). On failure or timeout, inspect the prior EAS build first: it can still be running after GitHub stops. Then use a **fresh Run workflow on main**, never **Re-run jobs**. Each retry can create a new build and consume a build number. If no trustworthy link is available, use the workflow logs and the existing project's EAS dashboard.

# Ship after qualification

Complete and record the one-time physical-device, backend, account, privacy and store qualification in the [setup guide](CI_CD_SETUP_GUIDE.md), then update the readiness records through review. Until that evidence is complete, the existing automatic production workflow stays blocked; a production run can show a failed preflight after a merge, with no deployment performed. A successful preview alone does not qualify store billing or a store archive.

Once qualified, merging to **main** runs CI, deploys required backend changes, and builds/uploads required iOS changes for **TestFlight processing**. Docs/tests-only changes do not build. TestFlight processing and tester setup happen in App Store Connect. **App Store review and public release are separate operator actions.**

Apple certificates, provisioning profiles, device registrations and account agreements need periodic attention. If signing expires or Apple requests action, repair the existing credentials/account setup before retrying; do not create a replacement app or project.
