# Native stack migration — September 2026

FlexBreak now targets Expo 57.0.21, React Native 0.86.3, React 19.2.3 and the New Architecture. Expo's installed `bundledNativeModules.json` determines native package versions; Node 22.23.2 is selected for EAS. Store identities and existing subscription SKUs are preserved. This is source and generated-project validation, not proof of signed binary or device readiness.

## Changed integration boundaries

- `expo-av` is replaced by `expo-audio` and `expo-video`. `nativeAudio.ts` and `NativeVideo.tsx` retain the routine UI's millisecond-based playback contract and translate native seconds, buffering, completion, seeking, muting and disposal. Recording uses WAV/16-bit LPCM at 16 kHz mono on iOS and AMR-WB at 16 kHz mono on Android. The speech payload declares the matching codec; the prior Android AAC-as-WebM mismatch is removed. `cancelRecording()` deletes the active or most recently completed temporary recording.
- Purchases use `expo-iap` 5.5.1 (StoreKit2; OpenIAP Google 3.5.0). Requests are event-based, never retried automatically, and Android supplies an eligible subscription offer token. `verify-purchase-v2` must verify store evidence before the client updates entitlement. Expired, revoked, mismatched, pending or unverifiable evidence cannot grant premium. Acknowledgment is awaited after persistence, with `isConsumable:false`. Cached receipts and invented renewal dates are no longer grant mechanisms.
- The Expo file-system legacy entry point preserves the three existing filesystem callers while using the supported SDK57 package. Generic Metro `/functions/` exclusion was narrowed to project backend directories because it incorrectly hid `semver/functions`, required by Reanimated.
- Android's notification asset is renamed `ai_notification_1.mp3` because uppercase native resource names are rejected by prebuild. Sound contents are unchanged. Splash configuration is reproducible through `expo-splash-screen`, replacing the reference to an excluded native storyboard. Microphone/audio, billing and minification settings use supported plugins.
- Obsolete dependencies removed after source/config search: `expo-av`, `expo-in-app-purchases`, the unused `expo-permissions` import/package, unused ZeroBounce SDK and Android progress bar, unused direct community CLI and clean-project tooling. Clipboard remains used. No progress/storage keys or SKU names are renamed.

Siri deep links remain functional through the existing scheme. The repository has no native AppIntent implementation, so automatic shortcut discovery is unverified/unsupported; Info.plist metadata alone does not implement an intent. No uncompiled native intent implementation was added.

## Dependency security compatibility patches

`npm audit fix` alone cannot update several upstream-pinned dependencies. `package.json` therefore pins patched compatible branches for tar, minimatch5, nanoid3, Joi17, AJV8 and YAML2. UUID11 retains the v1/v4 functions used by the inspected Xcode/bunyan/telemetry callers. EAS's diffLines usage is retained with diff8.0.3.

Two upstream import adaptations are required for patched dependencies:

| Consumer | Patched dependency | Adaptation |
|---|---|---|
| query-string 7.1.3 | decode-uri-component 0.5.0 | Read its ESM default export; preserve existing query-string CommonJS API. |
| EAS CLI 24.0.0 `generateAppConfigAsync` | ts-deepmerge 8.0.0 | Use the named `merge` export in the config generator. |

`scripts/patch-native-dependencies.mjs` runs at postinstall. It requires exact parent package versions and upstream SHA-256 file hashes, recognizes only its exact already-patched output, and fails visibly on unexpected upstream changes. Never install with `--ignore-scripts` for builds. Tests run actual malformed-escape query parsing and the real EAS config generator against a temporary app configuration. A green audit without these API adaptations would leave runtime/tooling failures.

Remove each override/patch once the corresponding upstream parent supports a secure dependency release. On any parent update, review the new API and source before changing the recorded hash; do not simply accept a mismatching file. Tests and `npm ci` must remain passing.

## Validation and remaining release evidence

Use Node22:

```sh
npm ci
npm run lint
npm run type-check
npm test
npm audit
npx expo install --check
npm run export:mobile
```

Both iOS and Android SDK57 projects generated successfully in a fresh disposable copy after the CNG changes. The stale tracked Expo52 directories were archived locally and removed; local Expo runs and EAS now generate native projects from app configuration and plugins. The final generated Android project contains exactly one release signing guard, enables the New Architecture and has no native GoogleServices plugin/configuration files. Inspect the generated manifests, Gradle configuration and Podfile before release.

Actual native compilation remains unverified: this machine has CommandLineTools rather than full Xcode. A checksum-verified, task-local Temurin21 JRE was provisioned for the Firestore emulator; this does not establish an Android SDK/JDK build toolchain. No EAS builds, credential operations, store uploads or deployments occurred. Require Xcode26/iOS26 SDK archive evidence, Android target API36+ and Billing8+ resolved dependency evidence, signing identity verification and physical-device regression testing. Keep release-readiness records blocked until that evidence exists. Unused native Firebase files and app-config references were removed with cloud push registration; the retained JavaScript Firebase identity is `flexbreak-28ad0`. Production authentication/backend integration and local reminder behavior still require verification, and no FCM integration is claimed.

## Generated native projects and local development

The stale tracked Expo52 `ios/` and `android/` trees were removed after comparison with the SDK57 disposable prebuild. A local preservation snapshot is in ignored `.artifacts/native-sdk52-before-cng/`; git history also retains the old tracked files. Both root native directories are now generated/ignored. Existing customizations are represented by app.json/config plugins: app identity and schemes, icon/splash assets, notification icon/sound, permissions, Siri metadata, audio/IAP, AdMob and release build properties. No native AppIntent implementation was found or claimed. AppDelegate/MainActivity/MainApplication were old Expo boilerplate; generated entitlements and ProGuard rules preserve their prior content.

Use Node22 and `npm ci`, then `npm run ios` or `npm run android`. With no native directory, Expo generates the SDK57 project before running a debug build. iOS requires full supported Xcode/CocoaPods and device signing when applicable; Android requires the matching Android SDK and JDK. This session did not compile those projects. These debug commands do not submit anything. For future native configuration changes, preserve any local edits and run an explicit `npx expo prebuild --clean --platform ios` or `--platform android` before the corresponding run command. Do not put durable customizations into generated directories: move them into app config/plugins first. No script automatically deletes local native edits on every run.

`withReleaseSigningGuard.mjs` appends an idempotent Gradle guard. At task-graph readiness, it reads the resolved release variant's signing configuration and invokes `scripts/check-android-signing.mjs` with only nonsecret metadata. Release packaging fails for missing/incomplete signing, a debug config/alias/file, or the publicly distributed template keystore bytes even when renamed. Debug tasks are unaffected. It does not treat `EAS_BUILD` as authorization and does not prove that an otherwise valid key belongs to the existing Play app; account/signing verification remains required.

[Expo's Android build process](https://docs.expo.dev/build-reference/android-builds/) injects signing after prebuild and before Gradle execution. The installed Expo EAS helper also assigns signing during task creation, before task-graph readiness. The guard therefore observes injected credentials rather than rejecting the template's initial debug setting. Use the protected EAS/qualification paths for real release credentials; an ordinary local release command intentionally fails on default debug signing. No native compilation or signing acceptance is claimed from source fixture tests alone.

Unused `googleServicesFile` entries and their root native Google configuration files were removed. Source search found no remaining app call to native/Expo push-token registration and no React Native Firebase package. Installed Expo notification scheduling uses local Android notification services; its GoogleServices config plugin only applies the native Google plugin when the optional config path is present. JavaScript Firebase authentication/backend identity remains `flexbreak-28ad0` through the existing JS configuration. This removes the unused Android `flexbreak-b8b74` linkage rather than silently switching its cloud project. Validate local reminders on devices; adding remote push later requires a separately verified native setup.

Post-CNG validation: 13 focused backend deployment, signing-validator/plugin and release tests passed. A fresh disposable SDK57 prebuild completed for both platforms, with exactly one release signing guard, `newArchEnabled=true`, and no native Google configuration files/plugin. `.easignore` includes the signing plugin and its runtime validator; the known-public debug keystore test fixture is visible to git and excluded from EAS with the test suite. This validates generation and JavaScript policy logic, not Gradle execution or a signed native binary.
