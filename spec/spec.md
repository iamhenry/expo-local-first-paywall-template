# RevenueCat Paywall Integration Specification

## Status

- Status: implementation-ready; the source must be fully wired before future-app configuration
- Target: this Expo 54 application
- Scope: vendor the existing onboarding package source into the app, preserve its current experience, and add an embedded RevenueCat dashboard paywall
- Reuse model: future apps copy the wired onboarding source and make only documented app-specific configuration changes
- Distribution: app-local source only; no npm publication
- Source baseline: `react-native-onboarding-flow@1.5.2`, upstream commit `e5bdfb963c4b4e33f5bb5ac7898e36fd9c627dd9`
- RevenueCat baseline: `react-native-purchases@10.4.3` and `react-native-purchases-ui@10.4.3`
- Research date: 2026-07-16
- Complexity: medium
- Estimate: 1-2 focused engineering days, excluding only RevenueCat dashboard, store, and sandbox setup

## Goal

Keep this app's current onboarding visuals, persistence, and placement unchanged while replacing the installed onboarding package with equivalent app-local source and adding a fully wired RevenueCat dashboard paywall after the final `Get Started` action.

The result should be copy-ready and plug-and-play: future Expo or React Native apps should only need to install the matching native packages, configure public platform keys, configure RevenueCat Dashboard products, and provide their slides, entitlement, placement, completion persistence, and navigation boundary. They should not need to rebuild the paywall state machine, event mapping, dismissal behavior, retry handling, or entitlement checks.

This is still starter source, not a general onboarding, subscription, or workflow framework. Reuse means copying working source and making small local edits, not publishing or configuring a second library.

## Expected User Flow

```text
App configures RevenueCat during root startup
  -> OnboardingGate checks existing MMKV onboarding completion
  -> existing onboarding modal and slides
  -> existing final Get Started button
  -> embedded RevenueCat dashboard paywall
       -> active configured entitlement: persist onboarding completion and close
       -> purchase with configured entitlement: persist onboarding completion and close
       -> restore with configured entitlement: persist onboarding completion and close
       -> dismiss: return to the final onboarding slide
       -> cancel or transaction error: remain on the paywall without completing
       -> CustomerInfo or Offering preparation failure: show retry and back actions
```

The app-level usage should be approximately:

```tsx
import {
  OnboardingFlow,
  RevenueCatPaywall,
} from "@/components/onboarding";

<OnboardingFlow
  slides={slides}
  visible={visible}
  showPaywall
  paywallComponent={
    <RevenueCatPaywall
      entitlementIdentifier="pro"
      placementIdentifier="onboarding_end"
    />
  }
  onComplete={handleComplete}
/>
```

The consuming app configures RevenueCat separately with its public platform SDK key. The delivered source includes this startup adapter and the app integration; future apps replace only the key source and app-specific identifiers:

```ts
Purchases.configure({ apiKey: PUBLIC_REVENUECAT_PLATFORM_SDK_KEY });
```

`Purchases.configure()` is synchronous in RevenueCat React Native SDK 10.4.3. Do not await it. Never place secret RevenueCat keys, REST API keys, or server credentials in app source or `EXPO_PUBLIC_*` variables.

## Plug-and-Play Contract

The implementation is complete only when a future app can copy the following wired source without reimplementing subscription behavior:

```text
components/onboarding/
  -> OnboardingFlow
  -> OnboardingModal
  -> OnboardingSlide
  -> RevenueCatPaywall
  -> typed paywall injection and dismissal
  -> loading, retry, back, and terminal callback safety

config/revenuecat.ts
  -> platform key selection
  -> idempotent native SDK configuration

components/OnboardingGate.tsx
  -> slide input
  -> paywall identifiers
  -> completion persistence boundary
  -> native-only paywall opt-in
```

Future apps must not need to add purchase buttons, call `purchasePackage`, call `restorePurchases`, inspect CustomerInfo, resolve Offerings, or implement paywall dismissal. Those behaviors are already part of the copied source.

### Future-App Configuration Checklist

1. Copy `components/onboarding`, the wired `components/OnboardingGate.tsx` integration, and the small `config/revenuecat.ts` startup adapter.
2. Install the exact matching `react-native-purchases` and `react-native-purchases-ui` versions.
3. Add public iOS and Android SDK keys through the app's environment/configuration system.
4. Call the provided `configureRevenueCat()` adapter once from the root startup path.
5. Provide the app's slides and existing completion persistence callback.
6. Set the RevenueCat entitlement identifier.
7. Set a placement identifier, or omit it to use the current Offering.
8. Configure products, entitlement, Offering, published dashboard paywall, placement, and store accounts in RevenueCat.
9. Create a native development build after adding the native packages.

Everything else is delivered by the copied source and should not require app-specific implementation.

## Acceptance Criteria

### Vendored Onboarding

- `react-native-onboarding-flow@1.5.2` production source is copied into `components/onboarding/src` before behavioral changes are made.
- `components/OnboardingGate.tsx` imports the local source through `@/components/onboarding`.
- The installed `react-native-onboarding-flow` dependency is removed after local parity is verified.
- Slides, media, animations, modal layout, progress indicators, buttons, labels, and theme behavior remain unchanged.
- The modal remains mounted from the same location in `app/_layout.tsx`.
- `OnboardingGate` continues to own MMKV completion persistence through the existing `onboarding_completed` key.
- The template includes a complete `config/revenuecat.ts` startup adapter and a complete `OnboardingGate` integration; future apps change configuration values and app boundaries, not RevenueCat flow logic.
- With no paywall configured, the existing final-slide completion path behaves exactly as it does today.
- Empty slides render nothing.
- Existing image-only use remains valid without `expo-av` installed.
- The vendored source retains a short provenance note identifying package version 1.5.2 and its upstream commit.

### RevenueCat Paywall

- The paywall remains opt-in through `showPaywall` and `paywallComponent`.
- This app enables the paywall explicitly from `OnboardingGate`; vendored `OnboardingFlow` remains reusable without RevenueCat.
- `OnboardingGate` enables the RevenueCat paywall only on iOS and Android; web keeps the existing no-paywall completion path.
- The paywall appears only after `Get Started` is pressed on the final slide.
- The paywall fills the existing full-screen paywall container.
- `RevenueCatUI.Paywall` renders the remotely configured dashboard paywall; no local pricing, package selection, purchase, or restore controls are recreated.
- Existing active access is checked before rendering the paywall.
- Purchase completes onboarding only when callback CustomerInfo contains the configured active entitlement.
- Restore completes onboarding only when callback CustomerInfo contains the configured active entitlement.
- Restore without that entitlement does not complete onboarding.
- Purchase cancellation, purchase errors, and restore errors do not complete onboarding.
- RevenueCat `onDismiss` rechecks CustomerInfo because it can fire after either a close action or a successful purchase.
- Dismissal without the entitlement returns to the final onboarding slide without completing.
- If the dismissal recheck fails, the flow fails closed by dismissing to the final slide; it never grants access.
- Reopening from the final slide presents a fresh paywall mount.
- CustomerInfo and Offering preparation failures share one safe retry/back state.
- A placement returning `null` does not fall back to another Offering and does not complete onboarding.
- Completion and dismissal callbacks cannot both escape from the same mounted paywall.

### App Integration

- RevenueCat configuration occurs before the user can reach the paywall.
- The configuration adapter is idempotent and safe to call from a root effect or equivalent startup boundary.
- iOS and Android use their own public RevenueCat platform SDK keys.
- Missing or placeholder public keys leave RevenueCat unconfigured; the paywall then reaches its safe preparation failure state rather than completing onboarding.
- Web does not configure the native RevenueCat SDK and retains the current direct onboarding completion behavior.
- `OnboardingGate` continues to persist completion and hide onboarding only after `OnboardingFlow` calls its existing `onComplete` handler.
- No subscription state, CustomerInfo, Offering, receipt, or transaction data is stored in MMKV.
- No router, navigation, account, analytics, or subscription-store abstraction is added.
- The reusable source exposes the callbacks needed for a consuming app's existing completion and dismissal boundary; it does not require a new router or storage system.

### Privacy and Logging

- No customer identifiers, CustomerInfo payloads, entitlement maps, receipts, Offering payloads, or transaction data are logged.
- User-facing failure messages do not include raw SDK errors or dashboard identifiers.
- Public platform SDK keys may be provided through `EXPO_PUBLIC_*`; secret/server keys may not.

### Verification

- TypeScript strict checking passes.
- iOS and web Expo exports resolve the vendored source and RevenueCat imports.
- Existing app startup and MMKV onboarding persistence continue to work.
- A native development build verifies the real dashboard paywall and store behavior.
- Expo Go is used only for Preview API Mode; it is not accepted as proof of real RevenueCat, StoreKit, or Google Play behavior.

## Current Repository State

```text
app/_layout.tsx
  -> renders the app providers and navigation stack
  -> mounts OnboardingGate after the Stack

components/OnboardingGate.tsx
  -> owns the two current slides
  -> reads and writes onboarding_completed through MMKV
  -> imports OnboardingFlow from react-native-onboarding-flow

react-native-onboarding-flow@1.5.2
  -> owns slide state and paywall state internally
  -> injects only onComplete into a supplied paywall element
  -> renders onboarding or a full-screen paywall in OnboardingModal
```

What already works:

- Image-based onboarding presentation and navigation.
- Full-screen modal presentation from the app root.
- MMKV-backed completion persistence.
- Opt-in custom-paywall support in the installed library.
- A full-screen paywall container in `OnboardingModal`.
- Optional `expo-av` behavior for image-only apps.
- Strict TypeScript configuration.
- Expo development client dependency.

What is missing:

- App-local onboarding source.
- Separate paywall dismissal behavior.
- RevenueCat startup configuration.
- Embedded dashboard paywall component.
- Exact-entitlement verification.
- Placement/current Offering preparation.
- Safe loading and preparation failure states.
- App-specific RevenueCat setup documentation.

The implementation must close all of these gaps before this specification is considered complete. A future app should not receive a partially wired component that still requires subscription logic to be written.

Repository constraints that replace assumptions from the library-oriented draft:

- There is no root `src` package tree.
- There is no `example` application.
- There are currently no `typecheck` or native `build` scripts.
- The repository uses Bun in its README and existing scripts and contains `bun.lockb`.

## Source Baseline and Vendoring Rule

Vendor these upstream 1.5.2 files without behavioral edits in the initial parity change:

```text
src/animations.ts
src/types.ts
src/index.ts
src/components/animations.ts
src/components/OnboardingFlow.tsx
src/components/OnboardingModal.tsx
src/components/OnboardingSlide.tsx
src/components/index.ts
```

Map them beneath `components/onboarding/src` with the same relative structure. Add `components/onboarding/index.ts` as the app-local entry point and `components/onboarding/UPSTREAM.md` with:

- Package name and version.
- Upstream repository URL.
- Exact source commit.
- Date copied.
- A note that the source is now intentionally app-owned and may diverge.

The vendored source is not a git submodule and is not synchronized automatically. Future changes are normal local app changes.

## Ideal State

```text
app/_layout.tsx
  -> configures RevenueCat once at startup
  -> mounts OnboardingGate in its current location

components/OnboardingGate.tsx
  -> owns slides and MMKV completion persistence
  -> opts into the paywall with app identifiers
  -> imports local onboarding source

components/onboarding
  -> contains the vendored onboarding presentation
  -> OnboardingFlow owns slide and paywall transitions
  -> RevenueCatPaywall owns RevenueCat preparation and event mapping
  -> OnboardingModal remains visually unchanged
```

## Ownership

### Vendored Onboarding Source Owns

- Existing modal, slides, media, animation, progress, and button presentation.
- Transition to an optional paywall after the final slide.
- Injection of `onComplete` and `onDismiss` into a supplied paywall element.
- Returning dismissal to the existing final slide.
- Embedded RevenueCat paywall preparation and event mapping.
- Loading and one safe preparation failure state.
- Terminal callback idempotency.
- A complete RevenueCat integration that is ready to render when the consuming app supplies valid configuration.

### OnboardingGate Owns

- This app's slides and copy.
- Whether the paywall is enabled.
- RevenueCat entitlement and placement identifiers used for onboarding.
- MMKV completion persistence.
- Hiding onboarding after successful completion.
- Mapping the copied flow to the consuming app's existing visibility and persistence boundary.

### Root App Owns

- RevenueCat public platform SDK keys.
- Calling `Purchases.configure()` once during startup.
- RevenueCat customer login/logout lifecycle if accounts are added later.
- App navigation and provider composition.
- Calling the provided startup adapter; it does not own Offering resolution, purchase handling, restore handling, or entitlement interpretation.

### RevenueCat Dashboard Owns

- Products and store connections.
- Entitlement and Offering configuration.
- Dashboard paywall content and pricing presentation.
- Placement targeting.
- Restore and close controls displayed inside the paywall.
- Paywalls V2 dismissal UI.

## Proposed Contracts

Add to vendored `components/onboarding/src/types.ts`:

```ts
export interface PaywallInjectedProps {
  onComplete?: () => void;
  onDismiss?: () => void;
}

export interface RevenueCatPaywallProps extends PaywallInjectedProps {
  entitlementIdentifier: string;
  placementIdentifier?: string;
}
```

Update the vendored flow contract:

```ts
export interface OnboardingFlowProps {
  slides: OnboardingSlideData[];
  visible: boolean;
  onComplete: () => void;
  onPaywallDismiss?: () => void;
  closeable?: boolean;
  showProgress?: boolean;
  theme?: OnboardingTheme;
  showPaywall?: boolean;
  paywallComponent?: React.ReactElement<PaywallInjectedProps>;
}
```

Narrow `OnboardingModalProps.paywallComponent` to the same React element type because it receives one cloneable element, not arbitrary text, arrays, or numbers.

Do not add these props:

- API key.
- Product or Offering identifier.
- Storage or navigation callbacks.
- Analytics client.
- `displayCloseButton`; Paywalls V2 dismissal UI is dashboard-owned.
- Generic public `onError`; preparation errors use one local safe state.
- A `continueWithoutSubscription` policy.

## Required Behavior

### OnboardingFlow

Add only the missing dismissal transition:

```ts
const handlePaywallDismiss = () => {
  setShowingPaywall(false);
  onPaywallDismiss?.();
};
```

Rules:

- Dismissal does not call `onComplete`.
- Keep `currentSlide` unchanged so the final slide reappears.
- Inject both `onComplete` and `onDismiss` with `React.cloneElement`.
- Paywall completion resets the slide index, clears paywall state, and calls `onComplete` exactly as the current source does.
- Normal no-paywall completion remains unchanged.
- Existing closeable-modal behavior remains unchanged.
- Do not alter `OnboardingModal` markup or styles.

### RevenueCat Startup

Add one complete, reusable configuration module that the template and future copied apps can call without reimplementing RevenueCat setup:

1. Selects the iOS or Android public SDK key from `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
2. Rejects missing or placeholder values without logging the value.
3. Does nothing on web because RevenueCat Billing setup is outside this specification.
4. Calls `Purchases.configure({ apiKey })` once on iOS or Android.
5. Does not fetch CustomerInfo or Offerings during root startup.
6. Does not log customer or subscription data.

Call this provided configuration adapter from `app/_layout.tsx` before `OnboardingGate` can reach the paywall. Configuration must remain outside `RevenueCatPaywall`. The adapter must be safe to call more than once, while the app should call it once during normal startup.

Web is not a real-purchase target for this implementation. `OnboardingGate` must leave `showPaywall` disabled on web so the existing direct completion path remains available. The web app must continue to compile; web purchases require separate RevenueCat Billing setup and are out of scope.

### RevenueCatPaywall State

Use this render-state union:

```ts
type PaywallState =
  | { status: "loading" }
  | { status: "ready"; offering: PurchasesOffering }
  | { status: "failure" };
```

Use refs, not additional React state, for:

- Mounted status.
- Current preparation request identity if needed to ignore stale retry results.
- One terminal outcome guard.

```ts
type TerminalOutcome = "pending" | "completed" | "dismissed";
```

### Preparation

On mount and retry:

1. Set the render state to loading.
2. Call `Purchases.getCustomerInfo()`.
3. If the configured entitlement is active, complete once and stop.
4. If `placementIdentifier` exists, call `Purchases.getCurrentOfferingForPlacement(placementIdentifier)`.
5. If no placement exists, call `Purchases.getOfferings()` and use `offerings.current`.
6. If the resolved result is `null`, missing, or rejected, show the single failure state.
7. Otherwise render `RevenueCatUI.Paywall` with `options={{ offering }}`.
8. Ignore state updates after unmount.
9. Ignore results from superseded preparation attempts.

Do not fall back from a configured placement to `offerings.current`. RevenueCat permits `null` as an intentional targeting result.

The local preparation layer cannot detect every native dashboard paywall rendering failure because `RevenueCatUI.Paywall` 10.4.3 exposes no paywall-load-error callback. Do not claim or test that unsupported guarantee.

### Failure State

Use one generic full-screen state containing:

- `Unable to load subscription options.`
- `Try Again`, which reruns preparation.
- `Back`, which takes the injected dismissal path.

Rules:

- Do not show raw SDK errors.
- Do not expose identifiers or RevenueCat configuration details.
- Do not provide `Continue Without Subscription`.
- Back returns to the final onboarding slide and does not persist completion.

### Entitlement Check

Use the exact configured entitlement:

```ts
const hasEntitlement = (
  customerInfo: CustomerInfo,
  entitlementIdentifier: string,
) => customerInfo.entitlements.active[entitlementIdentifier] !== undefined;
```

Do not complete based on:

- An unrelated active entitlement.
- Any active subscription product.
- Restore completion alone.
- Purchase cancellation.
- Purchase or restore errors.
- Raw dismissal.

### RevenueCatUI.Paywall Events

RevenueCat 10.4.3 callback payloads are wrapped objects:

```ts
onPurchaseCompleted={({ customerInfo, storeTransaction }) => {}}
onRestoreCompleted={({ customerInfo }) => {}}
onPurchaseError={({ error }) => {}}
onRestoreError={({ error }) => {}}
```

The component must not log or retain those payloads.

| Event | Behavior |
| --- | --- |
| `onPurchaseCompleted` | Complete once only when callback CustomerInfo contains the configured entitlement |
| `onRestoreCompleted` | Complete once only when callback CustomerInfo contains the configured entitlement |
| `onPurchaseCancelled` | Do not complete; leave the paywall available |
| `onPurchaseError` | Do not complete; leave the paywall available |
| `onRestoreError` | Do not complete; leave the paywall available |
| `onDismiss` | Recheck CustomerInfo; complete if entitled, otherwise dismiss to the final slide |
| dismissal recheck error | Dismiss to the final slide without completing |

RevenueCat documents that embedded `onDismiss` can fire after a successful purchase as well as after a close action. It must therefore be treated as a terminal-resolution signal, not proof that no purchase occurred.

### Callback Safety

- `onComplete` runs at most once per mounted paywall.
- `onDismiss` runs at most once per mounted paywall.
- Both callbacks cannot escape from the same mount.
- Set `terminalOutcomeRef.current` before calling either parent callback.
- Purchase or restore completion wins when its entitled callback occurs before the dismissal recheck resolves.
- The dismissal recheck checks the terminal guard again after awaiting CustomerInfo.
- No async branch sets state or calls callbacks after unmount.

This contract relies on RevenueCat's documented ordering that purchase completion is delivered before the automatic successful-purchase dismissal. The post-await guard prevents the common callback race from producing both outcomes.

## Boundaries

### In Scope

- Vendoring the existing package source into `components/onboarding`.
- Switching `OnboardingGate` from the npm package to the local source.
- Removing the npm onboarding dependency after parity verification.
- Complete reusable RevenueCat public-key configuration adapter.
- New embedded `RevenueCatPaywall` component.
- Minimal `onDismiss` wiring in the vendored flow.
- Correct paywall element typing.
- Existing-access and exact-entitlement checks.
- Placement or current Offering preparation.
- One loading state and one safe preparation failure state.
- Package and Bun lockfile updates.
- Concise README setup documentation.

### Out of Scope

- Onboarding visual or interaction redesign.
- Changes to current slide content or assets.
- Generic custom screens, forms, step registries, or workflow engines.
- New storage, navigation, analytics, or user-account abstractions.
- App-wide subscription state, listeners, caching, or paywall guards.
- RevenueCat initialization inside the paywall component.
- Direct purchase buttons or custom pricing UI.
- Trial calculations or entitlement expiration formatting.
- RevenueCat Customer Center.
- Web purchase support or RevenueCat Billing setup.
- Exit offers; RevenueCat does not support them for manually embedded paywall components.
- Production RevenueCat identifiers, keys, or customer logging.
- npm publication or automated upstream synchronization.
- Refactoring unrelated providers, database code, routing, or UI components.

### Files That Must Remain Behaviorally Unchanged

- `components/onboarding/src/components/OnboardingModal.tsx`: no markup or style changes after copying.
- `components/onboarding/src/components/OnboardingSlide.tsx`.
- Both copied animation modules.
- Current slide definitions and labels in `components/OnboardingGate.tsx`.
- Existing MMKV key and persistence behavior in `components/OnboardingGate.tsx`.
- Existing image-only behavior without `expo-av`.
- Existing app provider and navigation ordering in `app/_layout.tsx`, except for RevenueCat startup configuration.

## File Plan

### Add

| File | Purpose |
| --- | --- |
| `components/onboarding/index.ts` | Clean app-local export surface |
| `components/onboarding/UPSTREAM.md` | Vendored version, commit, source URL, and divergence note |
| `components/onboarding/src/index.ts` | Vendored public exports plus `RevenueCatPaywall` export |
| `components/onboarding/src/types.ts` | Vendored types plus injected paywall contracts |
| `components/onboarding/src/animations.ts` | Vendored public animation helpers |
| `components/onboarding/src/components/index.ts` | Vendored component exports plus paywall export |
| `components/onboarding/src/components/animations.ts` | Vendored internal animation helpers |
| `components/onboarding/src/components/OnboardingFlow.tsx` | Vendored slide/paywall state owner with dismissal transition |
| `components/onboarding/src/components/OnboardingModal.tsx` | Behaviorally unchanged vendored modal and paywall container |
| `components/onboarding/src/components/OnboardingSlide.tsx` | Behaviorally unchanged vendored media renderer |
| `components/onboarding/src/components/RevenueCatPaywall.tsx` | RevenueCat preparation, rendering, entitlement checks, and event mapping |
| `config/revenuecat.ts` | Complete reusable, idempotent platform public-key configuration adapter |

### Modify

| File | Change |
| --- | --- |
| `components/OnboardingGate.tsx` | Complete wired app integration: edit slides, completion persistence, entitlement, placement, and native-only opt-in without adding subscription logic |
| `app/_layout.tsx` | Configure RevenueCat once without changing provider, Stack, or onboarding placement |
| `package.json` | Remove `react-native-onboarding-flow`; add exact RevenueCat packages and a `typecheck` script |
| `bun.lockb` | Lock dependency changes using Bun |
| `README.md` | Document vendored source, public-key setup, dashboard prerequisites, development builds, and ownership boundaries |

Do not remove `react-native-onboarding-flow` until the local import, TypeScript check, Expo export, and manual onboarding parity check pass. The final implementation must not retain both runtime implementations.

## Dependency Plan

Use Bun as the repository's package manager because the current README, scripts, and latest dependency maintenance use it.

Production dependencies:

```text
react-native-purchases@10.4.3
react-native-purchases-ui@10.4.3
```

Both versions must remain exact because `react-native-purchases-ui@10.4.3` declares an exact peer dependency on `react-native-purchases@10.4.3`.

Required scripts:

```json
{
  "typecheck": "tsc --noEmit"
}
```

Do not add `expo-av`; the current app uses image-only slides and the vendored source must preserve its optional dynamic-loading behavior.

## Lean Implementation Sequence

### 1. Vendor and Prove Parity

1. Copy upstream 1.5.2 production source into `components/onboarding/src`.
2. Add the local barrel and provenance note.
3. Switch `OnboardingGate` to the local import without enabling RevenueCat.
4. Run typecheck and an iOS Expo export.
5. Confirm the existing two-slide onboarding and MMKV completion behavior manually.

Acceptance for this checkpoint:

- No visual or behavioral onboarding changes.
- No dependency on the installed onboarding package at runtime.
- Image-only build works without `expo-av`.

### 2. Add Minimal Dismissal Contract

1. Add `PaywallInjectedProps` and `onPaywallDismiss`.
2. Narrow paywall element typing.
3. Add `handlePaywallDismiss` to `OnboardingFlow`.
4. Inject `onComplete` and `onDismiss`.
5. Keep the current slide index on dismissal.

### 3. Add RevenueCatPaywall

1. Add the three-state preparation union.
2. Add mounted, request, and terminal guard refs.
3. Check CustomerInfo for existing exact entitlement access.
4. Resolve the placement Offering or current Offering.
5. Render the generic preparation failure state when resolution fails.
6. Render `RevenueCatUI.Paywall` with the resolved Offering.
7. Verify exact entitlement after purchase and restore.
8. Keep cancellation and transaction errors non-terminal.
9. Recheck CustomerInfo on dismiss.
10. Prevent stale or post-unmount state and callbacks.
11. Do not log RevenueCat payloads.

### 4. Configure the App

1. Add the complete reusable platform-key configuration adapter.
2. Call it once during native root startup and skip configuration on web.
3. Pass app-specific entitlement and optional placement identifiers from `OnboardingGate`; do not add purchase or Offering logic there.
4. Enable `showPaywall` only on iOS and Android.
5. Keep `handleComplete` as the only persistence path.
6. Add exact RevenueCat package versions with Bun.
7. Remove the external onboarding package dependency after parity passes.

### 5. Document and Verify

1. Add concise setup instructions to this app's README.
2. Run TypeScript and Expo export verification.
3. Perform native development-build verification with sandbox dashboard configuration.
4. Perform an independent read-only review for scope, privacy, and callback safety.

## README Requirements

Keep documentation concise and app-specific. Include:

1. The onboarding source and wired `components/OnboardingGate.tsx` integration are vendored and intentionally edited locally.
2. RevenueCat package versions must match exactly.
3. Public iOS and Android SDK key environment variables.
4. RevenueCat configuration occurs at app startup, outside the paywall component.
5. Dashboard products, entitlement, Offering, paywall, and optional placement prerequisites.
6. `OnboardingGate` owns this app's identifiers and MMKV completion.
7. Purchase, restore, dismissal, and preparation failure behavior.
8. Expo Go Preview API Mode is useful for a quick UI preview but cannot verify real purchases; it is not the source of production behavior.
9. A new native development build is required after adding native packages.
10. Paywalls V2 close controls are configured in the RevenueCat dashboard.
11. Embedded paywalls do not support exit offers.
12. RevenueCat customer or transaction payloads must not be logged.

Do not add npm publication, code generation, automated upstream sync, generic workflow, or custom-screen guidance.

## Build Verification

Run from the repository root after implementation:

```bash
bun run typecheck
bunx expo export --platform ios --output-dir /tmp/expo-local-first-paywall-ios-export
bun run build:web
```

The iOS export proves Metro can resolve the vendored source and RevenueCat native imports. Generated iOS export files stay outside the repository. The existing web export must still compile, but it does not prove web purchase support. The native development build is the proof that the wired production integration works.

Automated pass conditions:

- Every command exits zero.
- Existing image-only behavior works without `expo-av`.
- No generated export files appear in git status.
- No secret or production RevenueCat credential is introduced.

## Native Development-Build Verification

Expo exports cannot prove RevenueCat native UI or store behavior. The production source must already be fully wired; in a configured development build:

1. Verify the existing onboarding visuals, modal layout, navigation, labels, progress, and animations.
2. Verify existing MMKV completion still suppresses onboarding after relaunch.
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

Native prerequisites:

- Exact matching RevenueCat packages installed.
- A native development build created after installation.
- Public sandbox platform SDK keys configured.
- Sandbox products connected to the correct stores.
- Configured entitlement attached to those products.
- Published Offering and dashboard paywall.
- Placement configured when used.
- Dashboard paywall includes a close or back action when dismissal is expected.
- Sandbox StoreKit or Google Play tester account.

The only expected future-app code/configuration changes are the checklist items in `Plug-and-Play Contract`. Missing those external prerequisites is a setup problem, not an invitation to implement another paywall integration.

Expo Go may exercise RevenueCat Preview API Mode but is not accepted for these pass conditions.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Vendored source changes onboarding unintentionally | Copy first, verify the existing onboarding manually, then make only dismissal/paywall edits |
| App retains two onboarding implementations | Remove the npm package after local parity passes |
| Restore is treated as access without entitlement | Check the exact configured active entitlement |
| Purchase completion and automatic dismissal race | Recheck CustomerInfo and use one terminal outcome guard |
| Placement intentionally returns `null` | Do not fall back; use the common preparation failure state |
| SDK is not configured | Fail safely during preparation and document startup configuration |
| Native paywall load failures are overpromised | Limit the custom failure guarantee to detectable preparation failures |
| Expo Go creates false confidence | Require native development-build verification |
| RevenueCat package versions differ | Pin both packages to exact 10.4.3 |
| Sensitive RevenueCat data is logged | Prohibit payload and identifier logging in code and docs |
| Web behavior regresses | Keep the existing web export as a compile gate; web purchases remain out of scope |
| Scope grows into a framework | Keep slides, storage, navigation, identifiers, and app policy outside reusable flow internals |

## Definition of Done

- The current onboarding UI and MMKV behavior are unchanged.
- The app imports onboarding only from vendored local source.
- The copied source contains the complete RevenueCat paywall, startup adapter, entitlement checks, Offering resolution, failure states, and callback safety.
- The external onboarding package dependency is removed after the local source is active.
- Embedded RevenueCat dashboard paywall works through the existing full-screen slot.
- Purchase and restore require the configured active entitlement.
- Dismissal returns to the final slide when the dashboard provides a dismiss action.
- Detectable preparation failures never complete onboarding and support retry/back.
- Terminal callbacks are idempotent.
- Strict TypeScript and Expo iOS/web exports pass.
- Native development-build verification passes.
- README explains app-local ownership and RevenueCat setup.
- No sensitive RevenueCat data is logged or persisted.
- An independent read-only review finds no scope, correctness, privacy, or maintainability blockers.

## Official References

- RevenueCat displaying paywalls: `https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls`
- RevenueCat placements: `https://www.revenuecat.com/docs/tools/targeting/placements`
- RevenueCat CustomerInfo: `https://www.revenuecat.com/docs/customers/customer-info`
- RevenueCat restoring purchases: `https://www.revenuecat.com/docs/getting-started/restoring-purchases`
- RevenueCat Expo installation: `https://www.revenuecat.com/docs/getting-started/installation/expo`
- RevenueCat React Native UI 10.4.3 source: `https://github.com/RevenueCat/react-native-purchases/blob/10.4.3/react-native-purchases-ui/src/index.tsx`
- RevenueCat React Native core 10.4.3 source: `https://github.com/RevenueCat/react-native-purchases/blob/10.4.3/src/purchases.ts`
- Vendored onboarding baseline: `https://github.com/binb1/react-native-onboarding-flow/tree/e5bdfb963c4b4e33f5bb5ac7898e36fd9c627dd9`
- Zero Proof reference: `https://github.com/iamhenry/zero-proof-app`
- Yes Chef reference: `https://github.com/iamhenry/yes-chef-app`

## Confidence

Confidence: high, 96%.

The current app integration, onboarding package source, both production reference apps, npm package contracts, and official RevenueCat 10.4.3 source and documentation were inspected. Remaining uncertainty is limited to future SDK changes, app-specific RevenueCat dashboard configuration, and native store behavior that requires the development-build verification described above.
