# Implementation Deviations

Purpose: keep an honest record of intentional gaps from `spec/spec.md` while implementation is in progress. The target is no implementation deviations unless explicitly approved.

External app configuration placeholders are not deviations. Public SDK keys, dashboard products, entitlement, Offering, paywall, optional placement, store accounts, and sandbox testers are expected per-app setup.

## Format

| Date | Status | Area | Deviation | Reason | Impact | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-16 | Deferred | Native verification | Native development-build, simulator, and store-behavior checks are deferred to the user's Mac. | User explicitly cannot run simulator/native checks now. | Automated/export checks cannot prove RevenueCat native UI, purchases, restores, dashboard dismissal, or store sandbox behavior. | Run the manual Mac checklist below before accepting production readiness. |
| 2026-07-16 | Blocked | TypeScript verification | Repository-wide `bun run typecheck` does not pass. | Existing strict errors are confined to unrelated form, list, primitive, settings, and UI files; no changed integration file is reported. | The spec's repository-wide TypeScript pass condition remains unmet even though the RevenueCat changes introduce no reported type errors. | Resolve the baseline errors separately, then rerun `bun run typecheck`. |
| 2026-07-16 | Verify on native | Callback ordering | RevenueCat documentation confirms `onDismiss` can follow success but does not explicitly guarantee its order relative to `onPurchaseCompleted`. | The implementation follows the spec's terminal guard and post-await recheck contract; no finite client-side wait can guarantee an arbitrarily late callback. | Native behavior must confirm a successful purchase completes rather than returning to onboarding. | Exercise purchase success and automatic dismissal in the Mac sandbox checklist. |
| 2026-07-16 | Intentional | Optional video loading | Vendored `OnboardingSlide` throws the existing install guidance for video slides instead of dynamically loading `expo-av`. | Upstream 1.5.2 uses `require(variable)`, which Expo 54 Metro rejects at bundle time even for image-only slides; a literal import would also fail when `expo-av` is intentionally absent. | Image slides compile without `expo-av` as required, but enabling video requires installing `expo-av` and replacing the loader with a static import. | Revisit only if a consuming app adds video slides. |

## Manual Mac Checklist

Prerequisites:

- Exact matching RevenueCat packages installed: `react-native-purchases@10.4.3` and `react-native-purchases-ui@10.4.3`.
- Native development build created after package installation.
- Public sandbox platform SDK keys configured through `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
- Sandbox products connected to the correct stores.
- Configured entitlement attached to those products.
- Published Offering and dashboard paywall.
- Placement configured when used.
- Dashboard paywall includes a close or back action when dismissal is expected.
- Sandbox StoreKit or Google Play tester account available.

Checks:

1. Verify onboarding visuals, modal layout, navigation, labels, progress, and animations.
2. Verify MMKV completion still suppresses onboarding after relaunch.
3. Verify the dashboard paywall fills the existing paywall container.
4. Dismiss and confirm the unchanged final slide returns when the dashboard paywall exposes dismissal.
5. Reopen the paywall.
6. Cancel a purchase and confirm onboarding does not complete.
7. Complete a sandbox purchase and confirm onboarding persists completion exactly once.
8. Restore an entitled account and confirm completion exactly once.
9. Restore an account without the configured entitlement and confirm no completion.
10. Verify a placement configured as No Offering shows retry/back without fallback or completion.
11. Verify missing/offline Offering preparation shows retry/back.
12. Confirm no private RevenueCat data appears in application logs.

Expo Go may exercise RevenueCat Preview API Mode, but it is not accepted for these pass conditions.
