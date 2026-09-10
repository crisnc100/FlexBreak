# Build an iPhone preview

In GitHub, open **Actions → Build iPhone Preview → Run workflow**, select **main**, and run it. After CI and the signed build finish, open the build link in the run summary and install it on a registered iPhone. This builds the exact main revision selected when you clicked; if main moves before the build starts, dispatch again from current main.

One-time setup: configure the existing Expo project and production environment `EXPO_TOKEN`, register your iPhone with the intended Apple team (new-device registration may require the agent to run EAS and you to follow its device enrollment link), and prepare ad hoc signing credentials. See [CI and signing setup](CI_CD_SETUP_GUIDE.md). The preview uses the existing production runtime configuration with internal distribution. It does not upload to TestFlight, release publicly, or change readiness gates.

Preview and automatic production runs share one queue so they cannot race remote build numbers. GitHub can replace a pending run; an active run is not automatically canceled. If a preview replaces a queued production run, use a fresh **Automatic production deployment → Run workflow** on main after the active run finishes (or the next main push will trigger it). On failure or timeout, inspect the prior EAS build first: it can still be running after GitHub stops. Then use a **fresh Run workflow on main**, never **Re-run jobs**. Each retry can create a new build and consume a build number. If no trustworthy link is available, use the workflow logs and the existing project's EAS dashboard.

# Ship after qualification

Complete and record the one-time physical-device, backend, account, privacy and store qualification in the [setup guide](CI_CD_SETUP_GUIDE.md), then update the readiness records through review. Until that evidence is complete, automatic store delivery stays blocked; a production run can show a failed preflight after a merge, with no deployment performed. A successful preview alone does not qualify store billing or a store archive.

Once qualified, merging to **main** runs CI, deploys required backend changes, and builds/uploads required iOS changes for **TestFlight processing**. Docs/tests-only changes do not build. TestFlight processing and tester setup happen in App Store Connect. **App Store review and public release are separate operator actions.**

Apple certificates, provisioning profiles, device registrations and account agreements need periodic attention. If signing expires or Apple requests action, repair the existing credentials/account setup before retrying; do not create a replacement app or project.
