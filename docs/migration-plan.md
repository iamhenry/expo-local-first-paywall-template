# Expo SDK 55 Migration Plan

## Goal

Upgrade this application from Expo SDK 54 to the latest stable Expo SDK 55 patch without adopting experimental SDK features or introducing known behavior, data, build, or monetization regressions.

Complexity: Medium

Estimated effort: 3-6 engineering hours plus native build queues and device testing.

## Decision

Target Expo SDK 55, not SDK 56 or 57.

SDK 55 is the smallest supported migration from SDK 54. It preserves the iOS 15.1 deployment target, keeps Hermes V1 opt-in, and does not include the SDK 56 Expo Router/React Navigation separation. SDK 56 and 57 also carry a documented Reanimated/Hermes memory regression that directly affects this application.

Use the latest SDK 55 patch versions selected by `expo install --fix`; do not pin the initial `55.0.0` release versions.

## Current State

### Platform and Toolchain

| Area | Current state | Migration relevance |
| --- | --- | --- |
| Expo | SDK 54, installed as `54.0.12` | Target SDK 55 |
| React Native | `0.81.4` | SDK 55 currently selects `0.83.10` |
| React | `19.1.0` | SDK 55 selects `19.2.0` |
| Architecture | New Architecture enabled globally and per platform | SDK 55 requires New Architecture |
| Native projects | No committed `ios/` or `android/` directories | Project uses Continuous Native Generation |
| Development runtime | `expo-dev-client` installed | New development builds are mandatory after upgrade |
| Local Node.js | `18.19.1` | Unsupported by SDK 54 and 55 |
| iOS toolchain | No local/EAS Xcode version is declared | SDK 55 requires Xcode 26; EAS defaults to Xcode 26.2 |
| Build service | No `eas.json`; EAS owner/project ID are placeholders | Choose local native builds or configure EAS before build gates |
| Package managers | `bun.lockb` and `package-lock.json` both present | Creates non-deterministic dependency resolution |
| Automated tests | No test/spec files discovered | Verification depends on builds and focused smoke tests |

### Dependency Surface

The following packages are native or tightly coupled to React Native and must be treated as migration-sensitive.

| Package group | Current installed version | SDK 55 target or disposition |
| --- | --- | --- |
| Expo modules | SDK 54 package versions | Upgrade together to Expo-selected `55.x` versions |
| `expo-dev-client` | `6.0.13` | Upgrade to Expo-selected `55.x`; rebuild development clients |
| `expo-router` | `6.0.10` | Upgrade to Expo-selected `55.x`; keep direct React Navigation imports |
| `react-native-reanimated` | `4.1.2` | `4.2.1` |
| `react-native-worklets` | `0.5.1` | `0.7.4`; must move with Reanimated |
| `react-native-gesture-handler` | `2.28.0` | `2.30.x` |
| `react-native-screens` | `4.16.0` | `4.23.x` |
| `react-native-safe-area-context` | `5.6.1` | `5.6.2` |
| `react-native-svg` | `15.12.1` | `15.15.3` |
| `@shopify/flash-list` | `2.0.2` | Keep `2.0.2`; this is Expo's SDK 55 version |
| `react-native-mmkv` | `3.3.3` | Keep initially; v3 supports RN 0.75+ and requires New Architecture |
| `react-native-purchases` | `10.4.3` | Keep initially; verify native registration and purchase flows |
| `react-native-purchases-ui` | `10.4.3` | Keep paired with `react-native-purchases` |
| `@gorhom/bottom-sheet` | `5.2.6` | Keep initially; verify with Reanimated 4.2.1 |
| `nativewind` | `4.2.1` | Keep initially; verify Babel, Metro, native, and web output |
| `@react-navigation/native` | `7.1.18` | Keep; SDK 55 still supports the current Expo Router integration |
| `@expo/vector-icons` | `15.1.1` | Keep if accepted by Expo Doctor |

Versions in this table are the resolved packages currently installed in `node_modules`. Some `package.json` ranges are broader, including `nativewind@^4.1.23`, `@gorhom/bottom-sheet@^5.1.6`, and `@expo/vector-icons@^15.0.3`; the single-lockfile migration must make the resolved versions explicit and reproducible.

The remaining Radix, form, schema, utility, and web packages do not contain native code. They remain in scope for typecheck and web-export verification but should not be opportunistically upgraded.

### Known Code Changes

1. `app.config.ts` declares `newArchEnabled` three times. SDK 55 removes this option because New Architecture is mandatory.
2. `babel.config.js` explicitly registers `react-native-reanimated/plugin`. SDK 55 configures the Reanimated transform through `babel-preset-expo`.
3. `lib/android-navigation-bar.ts` calls deprecated navigation-bar APIs. `setBackgroundColorAsync()` has no effect under mandatory Android edge-to-edge, and `setButtonStyleAsync()` is replaced by `setStyle()`.
4. The app directly imports `@react-navigation/native` in six files. This is valid for SDK 55 and must not receive the SDK 56 Router codemod.
5. RevenueCat initialization, paywall rendering, MMKV preferences, SQLite data, notifications settings, FlashList screens, Bottom Sheet UI, and Reanimated components are critical regression paths.
6. `runtimeVersion` uses the `appVersion` policy while the app version is `1.0.0`. Expo requires a new runtime for native-code changes; publishing SDK 55 JavaScript under the SDK 54 runtime is unsafe.
7. RevenueCat silently skips configuration when public platform SDK keys are missing or placeholders. Build-environment injection must be verified without logging key values.
8. Web export uses a configured base URL and fetches `./database.sqlite` at runtime. A successful static export alone does not prove the deployed database path works.

## Ideal State

The migration is complete when all of the following are true:

- The project resolves to the latest stable Expo SDK 55 patch and Expo's expected React Native, React, and native package versions.
- Node.js 22 LTS is declared and used locally and in CI/build environments.
- Bun is the single package manager, its version is pinned in `package.json`, and only `bun.lockb` remains.
- The SDK 55 app version/runtime is distinct from every distributed SDK 54 binary before any build or EAS Update is published.
- A repeatable iOS and Android build path is selected: local native tooling or configured EAS profiles.
- Expo Doctor and Expo dependency validation pass without ignored or suppressed findings.
- The project generates clean native projects and builds new iOS and Android development clients.
- Existing MMKV preferences and SQLite records survive an in-place update from the SDK 54 build.
- RevenueCat configuration, offering retrieval, paywall presentation, cancellation, purchase, and restore paths work in sandbox/test environments.
- Existing navigation, notifications settings, lists, sheets, animations, themes, onboarding, and web output retain their behavior.
- No SDK 55 experimental APIs are introduced.

## Boundaries

### In Scope

- Toolchain changes required by SDK 55.
- Selecting one package manager and producing one deterministic lockfile.
- Expo, React, React Native, and Expo-supported native dependency alignment.
- Minimal configuration and source changes required by SDK 55.
- Clean regeneration of uncommitted native projects.
- Static checks, native builds, persisted-data checks, and focused smoke tests.
- Fixes for regressions proven to be caused by the SDK 55 migration.

### Out of Scope

- SDK 56 or SDK 57.
- Canary, beta, preview, or experimental package releases.
- SDK 56's Expo Router/React Navigation codemod.
- Migrating MMKV v3 to v4 without a demonstrated SDK 55 incompatibility.
- Replacing Bottom Sheet, NativeWind, FlashList, RevenueCat, SQLite, or Drizzle.
- UI redesigns, general refactors, formatting sweeps, or unrelated dependency upgrades.
- Database schema or product/paywall configuration changes.
- Removing the existing `typedRoutes` experiment unless SDK 55 proves it incompatible. The migration must not add new experimental flags.
- Changing bundle identifiers, package names, runtime-version policy, RevenueCat keys, or store product identifiers. Incrementing the app version to isolate the SDK 55 runtime is required and remains in scope.

### Expected File Boundary

The initial migration should be limited to these files unless a verification failure proves another change is necessary:

- `package.json`
- `bun.lockb`
- `package-lock.json` (remove after Bun is confirmed as the package manager)
- `app.config.ts`
- `babel.config.js`
- `lib/android-navigation-bar.ts`
- Toolchain version file, if the repository adopts one
- `eas.json` and EAS identifiers only if EAS is selected as the build path
- Focused tests or verification notes added specifically for the migration

Any source change outside this boundary must include the failing verification it fixes.

## Migration Sequence

### Phase 1: Capture the SDK 54 Baseline

1. Start from a clean migration branch with no unrelated changes.
2. Switch to Node.js 22 LTS before running Expo commands.
3. Record the resolved dependency tree and current Expo Doctor output.
4. Run the existing static checks and web export.
5. Serve the SDK 54 web export under `/expo-local-first-template` and confirm the SQLite-backed home screen loads.
6. Choose and record the native build path. If using EAS, configure the project and development/internal-distribution profiles before relying on EAS build gates.
7. Build and launch the existing SDK 54 Android and iOS development clients where build infrastructure permits.
8. Seed a baseline device installation with:
   - A selected theme and completed onboarding state in MMKV.
   - At least one active and one archived habit in SQLite.
   - A working RevenueCat sandbox/test user and offering.
9. Record cold-start behavior for both a fresh install and the seeded upgrade installation.
10. Record screenshots or short notes for the critical flows listed under verification.

If SDK 54 cannot pass a check, record it as a pre-existing failure. Do not silently classify it as an SDK 55 regression.

### Phase 2: Stabilize the Toolchain

1. Declare Node.js 22 LTS in the repository's chosen version mechanism.
2. Add a `packageManager` entry for the chosen Bun version.
3. Remove `package-lock.json` and reinstall from `bun.lockb` only.
4. Confirm a clean frozen-lockfile install succeeds.

Do not combine package-manager cleanup with unrelated dependency upgrades.

### Phase 3: Upgrade One SDK Level

1. Install the SDK 55 Expo package, then let Expo align all compatible dependencies:

   ```sh
   bun install expo@^55.0.0
   bunx expo install --fix
   ```

2. Accept Expo-selected versions for Expo modules, React, React Native, Reanimated, Worklets, Gesture Handler, Screens, Safe Area Context, and SVG.
3. Confirm `expo-dev-client` resolves to the SDK 55 package line before creating new development builds.
4. Keep MMKV, RevenueCat, Bottom Sheet, NativeWind, FlashList, and React Navigation at their current compatible versions unless Expo Doctor or a reproducible build/runtime failure requires a change.
5. Inspect the lockfile diff for duplicate React Native, Expo modules, Reanimated, or Worklets installations.
6. Run Expo Doctor before editing application code. Fix actionable findings; do not suppress them.

### Phase 4: Apply Required Code and Configuration Changes

1. Remove all `newArchEnabled` properties from `app.config.ts`.
2. Remove the explicit `react-native-reanimated/plugin` entry from `babel.config.js`; retain the NativeWind and SQL transforms.
3. Update Android navigation-bar handling:
   - Remove background-color writes that cannot work with edge-to-edge.
   - Replace `setButtonStyleAsync()` with the supported `setStyle()` behavior.
   - Configure the `expo-navigation-bar` plugin with `enforceContrast: false`; Expo documents this as required for `setStyle()` to affect three-button navigation.
4. Do not change direct React Navigation imports; they are an SDK 56 concern.
5. Do not add an `expo-notifications` config block unless build-time notification configuration is actually required. The current app only reads permissions and opens system settings.
6. Confirm the current `StatusBar` usage only sets foreground style; SDK 55 background/translucency APIs are no-ops under edge-to-edge.
7. Increment the app version before publishing an SDK 55 binary or update so the `appVersion` runtime policy cannot match SDK 54 binaries.
8. Audit scripts and CI for `eas update`. None currently exist; if one is introduced, SDK 55 requires an explicit `--environment` flag.

### Phase 5: Regenerate and Build Native Clients

1. Clear Metro and generated Expo caches.
2. Generate native projects from a clean prebuild.
3. Build a fresh Android development client.
4. Build a fresh iOS development client on macOS or EAS using Xcode 26 or newer. EAS uses Xcode 26.2 by default for SDK 55.
5. Do not commit generated `ios/` or `android/` directories unless the repository intentionally changes away from Continuous Native Generation.
6. If using EAS internal distribution for iOS, register test devices and include their UDIDs in the ad hoc provisioning profile.

### Phase 6: Verify and Merge

Run the verification matrix below. Fix only failures that are new relative to the SDK 54 baseline. Repeat all affected checks after each fix.

Merge only when every required gate passes and no dependency warning is being ignored.

## Verification Matrix

### Gate A: Deterministic Install and Static Checks

Run:

```sh
bun install --frozen-lockfile
bun run expo-check
bunx expo-doctor@latest
bun run typecheck
bun run build:web
```

Pass conditions:

- All commands exit successfully.
- Expo Doctor reports no incompatible or duplicate native modules.
- One React, React Native, Reanimated, and Worklets version is resolved.
- Web export completes without missing WASM, SQL, NativeWind, icon, or routing assets.
- The exported site works when served under `/expo-local-first-template`: `database.sqlite` loads, SQL.js initializes, styles render, and the home screen leaves its loading state.

### Gate B: Native Build and Launch

Pass conditions:

- Clean Android development build compiles, installs, and reaches the first interactive screen.
- Clean iOS development build compiles, installs, and reaches the first interactive screen.
- The iOS build uses Xcode 26 or newer.
- No missing native module, TurboModule, worklet, autolinking, or duplicate-symbol errors appear.
- Metro starts from a cleared cache and reloads the app successfully.

### Gate C: Persisted Data Upgrade

Use the same bundle identifier/package name and update an installed SDK 54 build with the SDK 55 build without uninstalling.

Pass conditions:

- Selected theme remains unchanged.
- Onboarding completion remains unchanged.
- Existing active and archived habits remain readable.
- A new habit can be created, updated, archived, restored, and deleted.
- Restarting the app preserves the modified state.
- No MMKV reset, SQLite migration error, or unexpected empty database occurs.

This gate is mandatory because clean-install testing cannot detect persisted-data regressions.

### Gate D: RevenueCat and Paywall

Test with sandbox/Test Store accounts on physical devices where required.

Pass conditions:

- `Purchases.configure()` completes without a null native module or launch crash.
- Valid public iOS/Android SDK keys are present in their build environments without printing their values; placeholder or absent keys fail the gate.
- Customer info and offerings load.
- The `onboarding_end` placement returns an offering and the `pro` entitlement completes onboarding.
- `RevenueCatUI.Paywall` opens and dismisses cleanly.
- Cancelling a purchase returns to the expected state.
- A sandbox purchase grants the expected entitlement.
- Restore purchases updates entitlement state.
- Dismissal, loading failure, and purchase failure do not incorrectly persist onboarding completion.
- Reopening and rapidly dismissing the paywall does not crash Android or iOS.

Do not merge based only on Expo Go or browser preview behavior; real purchases require development builds.

### Gate E: UI and Native Dependency Smoke Tests

Pass conditions on both platforms unless noted:

- App starts, splash screen hides, and fonts render.
- Fresh-install and upgrade-install cold starts complete without a blank screen: fonts load, SQLite initializes, migrations finish, RevenueCat configuration runs, and onboarding/paywall reaches a stable state.
- Backgrounding and foregrounding preserves the current route and local state.
- Core habit reads and writes work after launching offline.
- Light, dark, and system themes update the UI correctly.
- Android content respects edge-to-edge; status-bar text and three-button navigation controls remain legible in light and dark themes. Gesture navigation is checked separately because `NavigationBar.setStyle()` does not affect it.
- Tab navigation, archive navigation, back gestures, and scroll-to-top behavior work.
- Active and archived FlashLists render, scroll rapidly, and update without blank content or loops.
- Bottom sheets open, drag, resize, handle keyboard appearance, and dismiss without clipping or disappearing.
- Dialog, select, switch, form, progress, and skeleton animations run without worklet errors.
- Notification permission state loads and the settings action opens the correct system screen.
- Onboarding can advance, dismiss, and resume without stale state.
- `ltstarter://` opens the app from cold and warm states without losing routing behavior.
- Privacy, terms, and feedback actions open through `expo-web-browser` on native platforms.

### Gate F: Production-Like Build

Pass conditions:

- Android release or internal-distribution build succeeds.
- iOS release or internal-distribution build succeeds.
- The built binaries launch without development-server dependencies.
- A short production-like smoke test covers database load, navigation, paywall presentation, and theme restoration.
- The SDK 55 app version/runtime differs from distributed SDK 54 binaries before any update is published.

## Regression Triage Rules

For every failure:

1. Reproduce it twice on SDK 55.
2. Compare it with the recorded SDK 54 baseline.
3. Identify the smallest owning dependency or configuration change.
4. Prefer the Expo-selected version and a minimal application fix over package overrides.
5. Do not use `--force`, dependency validation exclusions, broad resolutions, patches, or experimental releases without a separately reviewed decision.
6. Re-run the failed gate plus all downstream gates after the fix.

## Stop Conditions

Pause the migration and remain on SDK 54 if any of the following cannot be resolved without leaving the agreed boundaries:

- RevenueCat purchase or restore flows fail on a supported physical device.
- Existing MMKV or SQLite data is lost or cannot be read after an in-place update.
- A required native dependency has no stable RN 0.83-compatible release.
- Android or iOS production-like builds require forced or conflicting native dependency versions.
- A critical UI flow has a repeatable regression with no stable fix.
- The SDK 55 build or update would share a runtime version with a distributed SDK 54 binary.

Do not solve a stop condition by jumping directly to SDK 56/57. Reassess the target separately with new evidence.

Do not run `eas update` from the migration branch until the SDK 55 app version/runtime is isolated and the target environment is explicitly selected.

## Rollback

Rollback means reverting the migration branch or commit set to the last verified SDK 54 state and rebuilding SDK 54 clients. Do not publish an SDK 54 over-the-air update to an SDK 55 binary unless runtime-version compatibility is explicitly verified.

Because `runtimeVersion` uses the application version policy, confirm the release version and update channel before distributing SDK 55 builds. Native SDK changes require new binaries.

## Acceptance Criteria

The migration is accepted only when:

- All six verification gates pass.
- No known regression is waived without a documented product decision.
- No experimental SDK package or API was introduced.
- The final diff stays within the expected file boundary, or each additional file is tied to a reproduced SDK 55 failure.
- The SDK 54 baseline and SDK 55 results are recorded in the pull request or migration evidence.
- A reviewer can reproduce the install, static checks, and build steps from the repository documentation.

## Implementation Checklist

Complete this checklist in order. Attach command output, build links, screenshots, or short notes to the migration pull request for every evidence item.

### 1. Baseline

- [x] Create a dedicated SDK 55 migration branch from a clean SDK 54 revision.
- [x] Record the starting commit SHA.
- [x] Record `node --version`, `bun --version`, and the resolved top-level dependency tree.
- [x] Run and record the SDK 54 Expo Doctor result.
- [x] Run and record the SDK 54 typecheck result.
- [x] Run and record the SDK 54 web-export result.
- [x] Serve the SDK 54 web export under `/expo-local-first-template` and verify the SQLite-backed home screen loads.
- [x] Choose and record local native builds or EAS as the iOS/Android build path.
- [ ] If using EAS, configure the EAS project and development/internal-distribution profiles before build verification.
- [ ] Build and launch the SDK 54 Android development client.
- [ ] Build and launch the SDK 54 iOS development client.
- [x] Record any pre-existing warnings or failures so they are not misclassified as migration regressions.
- [ ] Seed the upgrade-test installation with a selected theme and completed onboarding state.
- [ ] Seed SQLite with at least one active habit and one archived habit.
- [ ] Confirm the RevenueCat sandbox/Test Store offering loads before upgrading.
- [ ] Record fresh-install and seeded-upgrade cold-start behavior.

### 2. Toolchain and Package Manager

- [x] Switch the development and build environments to Node.js 22 LTS.
- [x] Declare the supported Node.js version in the repository.
- [x] Add the chosen Bun version to `package.json#packageManager`.
- [x] Confirm Bun is the package manager used by local development and CI.
- [x] Remove `package-lock.json` after Bun is confirmed.
- [x] Reinstall dependencies using Bun only.
- [x] Confirm `bun install --frozen-lockfile` succeeds from a clean install.
- [x] Verify the lockfile contains no duplicate React, React Native, Expo module, Reanimated, or Worklets versions.

### 3. SDK and Dependency Upgrade

- [x] Install Expo SDK 55 with `bun install expo@^55.0.0`.
- [x] Align compatible dependencies with `bunx expo install --fix`.
- [x] Confirm Expo resolves to the latest stable SDK 55 patch.
- [x] Confirm React resolves to Expo's SDK 55 version.
- [x] Confirm React Native resolves to Expo's SDK 55 version.
- [x] Confirm all installed Expo modules resolve to compatible `55.x` versions.
- [x] Confirm `expo-dev-client` resolves to the Expo SDK 55 package line.
- [x] Confirm Reanimated and Worklets resolve to Expo's paired versions.
- [x] Confirm Gesture Handler, Screens, Safe Area Context, and SVG match Expo's SDK 55 versions.
- [x] Keep FlashList at Expo's supported `2.0.2` unless verified evidence requires otherwise.
- [x] Keep MMKV v3 unless a reproducible SDK 55 incompatibility requires otherwise.
- [x] Keep RevenueCat core and UI packages on exactly matching versions.
- [x] Avoid unrelated dependency upgrades.
- [x] Run Expo Doctor and resolve every actionable finding without exclusions or forced resolutions.

### 4. Required Source Changes

- [x] Remove global `newArchEnabled` from `app.config.ts`.
- [x] Remove iOS `newArchEnabled` from `app.config.ts`.
- [x] Remove Android `newArchEnabled` from `app.config.ts`.
- [x] Remove the explicit `react-native-reanimated/plugin` from `babel.config.js`.
- [x] Retain the NativeWind Babel setup.
- [x] Retain the inline SQL import transform.
- [x] Remove `NavigationBar.setBackgroundColorAsync()` usage.
- [x] Replace `NavigationBar.setButtonStyleAsync()` with the supported `NavigationBar.setStyle()` behavior.
- [x] Add the `expo-navigation-bar` config plugin with `enforceContrast: false` for `setStyle()` support.
- [ ] Verify Android navigation controls remain legible with gesture and three-button navigation.
- [x] Confirm `StatusBar` uses no deprecated background, translucency, or network-activity APIs.
- [x] Increment the app version so SDK 55 builds cannot share the SDK 54 `appVersion` runtime.
- [x] Confirm the repository has no `eas update` command; if one is added, include `--environment` explicitly.
- [x] Leave direct `@react-navigation/native` imports unchanged.
- [x] Do not add SDK 56 codemods or compatibility code.
- [x] Do not add new experimental flags or packages.

### 5. Static Verification

- [x] Run `bun install --frozen-lockfile` successfully.
- [x] Run `bun run expo-check` successfully.
- [x] Run `bunx expo-doctor@latest` successfully.
- [ ] Run `bun run typecheck` successfully.
- [x] Run `bun run build:web` successfully.
- [x] Confirm web output includes styles, fonts, icons, WASM, SQL assets, and routes.
- [x] Serve the export under `/expo-local-first-template` and confirm `database.sqlite` loads and SQL.js initializes.
- [x] Confirm NativeWind styles work on initial load and after a development reload.
- [x] Review the final dependency and lockfile diff for unexpected additions.

### 6. Native Regeneration and Builds

- [x] Clear Metro and Expo generated caches.
- [x] Run a clean prebuild.
- [x] Confirm generated native projects contain RevenueCat, MMKV, Reanimated, Worklets, SQLite, and notification modules.
- [x] Build a fresh Android development client.
- [ ] Install and launch the Android development client.
- [ ] Build a fresh iOS development client with an SDK 55-compatible Xcode image.
- [ ] Confirm the iOS development build uses Xcode 26 or newer.
- [ ] If using EAS iOS internal distribution, register test devices and refresh the ad hoc profile before building.
- [ ] Install and launch the iOS development client.
- [ ] Confirm neither platform logs missing native module, TurboModule, worklet, or autolinking errors.
- [x] Confirm generated `ios/` and `android/` directories remain uncommitted under the CNG workflow.

### 7. Persisted Data Regression Test

- [ ] Install the SDK 55 build over the seeded SDK 54 build without uninstalling.
- [ ] Confirm the selected theme survives the update.
- [ ] Confirm onboarding completion survives the update.
- [ ] Confirm existing active and archived habits survive the update.
- [ ] Create and edit a habit.
- [ ] Archive and restore a habit.
- [ ] Delete a habit.
- [ ] Restart the app and confirm all resulting state remains correct.
- [ ] Confirm no MMKV reset, SQLite migration error, or empty database occurs.

### 8. RevenueCat Regression Test

- [ ] Confirm `Purchases.configure()` completes on iOS without a null native module or crash.
- [ ] Confirm `Purchases.configure()` completes on Android without a null native module or crash.
- [ ] Confirm non-placeholder public RevenueCat keys are injected for each platform without logging their values.
- [ ] Load customer information and the configured offering.
- [ ] Confirm the `onboarding_end` placement returns an offering.
- [ ] Confirm the `pro` entitlement completes onboarding.
- [ ] Open and dismiss `RevenueCatUI.Paywall` repeatedly on both platforms.
- [ ] Cancel a sandbox purchase and confirm the expected UI state.
- [ ] Complete a sandbox purchase and confirm the expected entitlement.
- [ ] Restore purchases and confirm entitlement state updates.
- [ ] Confirm dismissal, offering failure, purchase failure, and restore failure do not persist onboarding completion.
- [ ] Restart the app and confirm purchased entitlement state reloads.
- [ ] Record platform, OS, device, RevenueCat package version, and result as evidence.

### 9. UI and Behavior Regression Test

- [ ] Verify splash screen and font loading.
- [ ] Cold-launch a fresh install and verify splash, fonts, database, migration, RevenueCat, and onboarding settle without a blank or stuck screen.
- [ ] Cold-launch the in-place upgrade installation and verify the same startup sequence.
- [ ] Background and foreground the app and verify route and local state remain intact.
- [ ] Launch offline and verify existing habits load and local create/edit/archive operations work.
- [ ] Verify light theme.
- [ ] Verify dark theme.
- [ ] Verify system theme changes.
- [ ] Verify tabs, archive navigation, back gestures, and scroll-to-top behavior.
- [ ] Verify active and archived FlashLists render and scroll without blank content or loops.
- [ ] Verify Bottom Sheets open, drag, handle the keyboard, and dismiss on iOS.
- [ ] Verify Bottom Sheets open, drag, handle the keyboard, and dismiss on Android.
- [ ] Verify dialogs, selects, switches, forms, progress, and skeleton animations show no worklet errors.
- [ ] Verify Reanimated worklets execute after removing the explicit Babel plugin.
- [ ] Verify notification permission state loads.
- [ ] Verify the notification settings action opens the correct system screen.
- [ ] Verify onboarding advances, resumes, completes, and dismisses correctly.
- [ ] Verify Android edge-to-edge content and navigation controls in light and dark themes.
- [ ] Verify Android status-bar text contrast in light and dark themes.
- [ ] Open `ltstarter://` from cold and warm states and verify stable routing behavior.
- [ ] Verify privacy, terms, and feedback actions open through `expo-web-browser` on iOS and Android.

### 10. Production-Like Verification

- [x] Build an Android internal-distribution or release binary.
- [ ] Build an iOS internal-distribution or release binary.
- [ ] Launch both binaries without a development server.
- [ ] Smoke-test database load, navigation, theme restoration, and paywall presentation in both binaries.
- [ ] Confirm the release version, runtime version, and update channel are correct before distribution.
- [x] Confirm the SDK 55 app version/runtime cannot target distributed SDK 54 binaries.
- [x] Confirm no EAS Update is published from the migration branch before runtime isolation and explicit environment selection.

### 11. Review and Completion

- [ ] Confirm every acceptance criterion is satisfied.
- [x] Confirm every additional changed file is tied to a reproduced migration requirement.
- [x] Confirm no warning, failing check, or regression is silently waived.
- [ ] Attach SDK 54 baseline and SDK 55 result evidence to the pull request.
- [x] Obtain code review for dependency, configuration, and lockfile changes.
- [ ] Obtain product verification for onboarding and paywall behavior.
- [ ] Merge only after all required gates pass.
- [x] Preserve the verified SDK 54 revision as the rollback point until SDK 55 is released successfully.

## Execution Evidence

Evidence recorded on 2026-07-16. The migration implementation is code-vetted, but the migration is not release-accepted because all six verification gates have not passed. Material deviations and evidence gaps are tracked in [migration-deviations.md](migration-deviations.md).

| Area | Proven result | Status |
| --- | --- | --- |
| SDK 54 comparison | Immutable commit `64dfcb4` reconstructed after migration: frozen install, web export, base-path database load, and home render passed; Expo checks and 19 type errors were recorded | Partial baseline |
| Toolchain and dependencies | Node 22, Bun 1.3.5, Expo 55.0.28, React 19.2, and React Native 0.83.6 aligned; frozen install, Expo check, and Expo Doctor 19/19 passed | Passed |
| Static and web | Web assets, routes, styles, fonts, SQL.js WASM, SQLite response, stable home render, cache-clear development start, and NativeWind reload passed; typecheck retains the same 19 SDK 54 errors | Partial |
| Android native | Clean CNG prebuild and single-ABI x86_64 debug and release compilation passed; binaries were not installed or launched, and the release APK is debug-signed | Compile only |
| iOS native | Build, Xcode 26, install, and launch evidence require the user's Mac | Pending |
| Device behavior | Persisted data, RevenueCat, native UI, cold start, deep links, offline behavior, and production-like launches are untested | Pending |
| Review | Independent quality gate approved the implementation at 92/100; product and device acceptance remain open | Code-vetted only |

## Official References

- Expo SDK 55 release notes: <https://expo.dev/changelog/sdk-55>
- Expo SDK 55 package versions: <https://raw.githubusercontent.com/expo/expo/sdk-55/packages/expo/bundledNativeModules.json>
- Expo SDK 55 reference: <https://docs.expo.dev/versions/v55.0.0/>
- Expo upgrade guide: <https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/>
- Expo release statuses: <https://docs.expo.dev/more/release-statuses/>
- Expo development builds: <https://docs.expo.dev/develop/development-builds/introduction/>
- Expo runtime versions and update compatibility: <https://docs.expo.dev/eas-update/runtime-versions/>
- EAS internal distribution and iOS device registration: <https://docs.expo.dev/build/internal-distribution/>
- Expo SDK 55 NavigationBar requirements: <https://docs.expo.dev/versions/v55.0.0/sdk/navigation-bar/>
- Expo SDK 55 Notifications behavior and configuration: <https://docs.expo.dev/versions/v55.0.0/sdk/notifications/>
- React Native MMKV v3 documentation: <https://github.com/mrousavy/react-native-mmkv/blob/v3.3.3/README.md>
- RevenueCat Expo installation: <https://www.revenuecat.com/docs/getting-started/installation/expo>
