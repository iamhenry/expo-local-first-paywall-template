# RevenueCat Paywall Integration Specification

## Status

- Status: implementation-ready after product identifiers and dashboard configuration are supplied
- Target: this Expo 54 application
- Scope: vendor the existing onboarding package source into the app, preserve its current experience, and add an embedded RevenueCat dashboard paywall
- Reuse model: future apps copy `components/onboarding` and customize it locally
- Distribution: app-local source only; no npm publication
- Source baseline: `react-native-onboarding-flow@1.5.2`, upstream commit `e5bdfb963c4b4e33f5bb5ac7898e36fd9c627dd9`
- RevenueCat baseline: `react-native-purchases@10.4.3` and `react-native-purchases-ui@10.4.3`
- Research date: 2026-07-16
- Complexity: medium
- Estimate: 1-2 focused engineering days, excluding RevenueCat dashboard, store, and sandbox setup

## Goal

Keep this app's current onboarding visuals, persistence, and placement unchanged while replacing the installed onboarding package with equivalent app-local source and adding an opt-in RevenueCat dashboard paywall after the final `Get Started` action.

The result should be practical starter source, not a general onboarding, subscription, or workflow framework.

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

The consuming app configures RevenueCat separately with its public platform SDK key:

```ts
Purchases.configure({ apiKey: PUBLIC_REVENUECAT_PLATFORM_SDK_KEY });
```

`Purchases.configure()` is synchronous in RevenueCat React Native SDK 10.4.3. Do not await it. Never place secret RevenueCat keys, REST API keys, or server credentials in app source or `EXPO_PUBLIC_*` variables.

## Acceptance Criteria

### Vendored Onboarding

- `react-native-onboarding-flow@1.5.2` production source is copied into `components/onboarding/src` before behavioral changes are made.
- `components/OnboardingGate.tsx` imports the local source through `@/components/onboarding`.
- The installed `react-native-onboarding-flow` dependency is removed after local parity is verified.
- Slides, media, animations, modal layout, progress indicators, buttons, labels, and theme behavior remain unchanged.
- The modal remains mounted from the same location in `app/_layout.tsx`.
- `OnboardingGate` continues to own MMKV completion persistence through the existing `onboarding_completed` key.
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
- iOS and Android use their own public RevenueCat platform SDK keys.
- Missing or placeholder public keys leave RevenueCat unconfigured; the paywall then reaches its safe preparation failure state rather than completing onboarding.
- Web does not configure the native RevenueCat SDK and retains the current direct onboarding completion behavior.
- `OnboardingGate` continues to persist completion and hide onboarding only after `OnboardingFlow` calls its existing `onComplete` handler.
- No subscription state, CustomerInfo, Offering, receipt, or transaction data is stored in MMKV.
- No router, navigation, account, analytics, or subscription-store abstraction is added.

### Privacy and Logging

- No customer identifiers, CustomerInfo payloads, entitlement maps, receipts, Offering payloads, or transaction data are logged.
- User-facing failure messages do not include raw SDK errors or dashboard identifiers.
- Public platform SDK keys may be provided through `EXPO_PUBLIC_*`; secret/server keys may not.

### Verification

- Vendored parity tests pass before RevenueCat behavior is added.
- Focused tests cover paywall entry, completion, dismissal, reopening, preparation, and exact-entitlement behavior.
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
- Jest test infrastructure and focused onboarding/paywall tests.
- App-specific RevenueCat setup documentation.

Repository constraints that replace assumptions from the library-oriented draft:

- There is no root `src` package tree.
- There is no `example` application.
- There are currently no `test`, `typecheck`, or native `build` scripts.
- The repository uses Bun in its README and existing scripts and contains `bun.lockb`.
- `package-lock.json` is stale and does not include the currently declared onboarding dependency.

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
src/__tests__/OnboardingFlow.test.tsx
src/__tests__/OnboardingSlide.test.tsx
src/__tests__/OnboardingSlide.noexpoav.test.tsx
src/__tests__/setup.ts
src/__tests__/__mocks__/react-native.js
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

### OnboardingGate Owns

- This app's slides and copy.
- Whether the paywall is enabled.
- RevenueCat entitlement and placement identifiers used for onboarding.
- MMKV completion persistence.
- Hiding onboarding after successful completion.

### Root App Owns

- RevenueCat public platform SDK keys.
- Calling `Purchases.configure()` once during startup.
- RevenueCat customer login/logout lifecycle if accounts are added later.
- App navigation and provider composition.

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

Add one app-owned configuration module that:

1. Selects the iOS or Android public SDK key from `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
2. Rejects missing or placeholder values without logging the value.
3. Does nothing on web because RevenueCat Billing setup is outside this specification.
4. Calls `Purchases.configure({ apiKey })` once on iOS or Android.
5. Does not fetch CustomerInfo or Offerings during root startup.
6. Does not log customer or subscription data.

Call this configuration from `app/_layout.tsx` before `OnboardingGate` can reach the paywall. Configuration must remain outside `RevenueCatPaywall`.

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
- App-owned RevenueCat public-key configuration.
- New embedded `RevenueCatPaywall` component.
- Minimal `onDismiss` wiring in the vendored flow.
- Correct paywall element typing.
- Existing-access and exact-entitlement checks.
- Placement or current Offering preparation.
- One loading state and one safe preparation failure state.
- Focused Jest infrastructure and tests.
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
| `components/onboarding/src/__tests__/OnboardingFlow.test.tsx` | Vendored regressions plus paywall entry/dismissal coverage |
| `components/onboarding/src/__tests__/OnboardingSlide.test.tsx` | Vendored slide regressions |
| `components/onboarding/src/__tests__/OnboardingSlide.noexpoav.test.tsx` | Vendored optional-`expo-av` regression |
| `components/onboarding/src/__tests__/RevenueCatPaywall.test.tsx` | Focused RevenueCat behavior tests |
| `components/onboarding/src/__tests__/setup.ts` | Jest setup copied and adapted to the app root |
| `components/onboarding/src/__tests__/__mocks__/react-native.js` | Existing lightweight React Native test mock if still required by the chosen preset |
| `config/revenuecat.ts` | App-owned, idempotent platform public-key configuration |
| `jest.config.js` | Expo-compatible Jest configuration scoped to app tests |

### Modify

| File | Change |
| --- | --- |
| `components/OnboardingGate.tsx` | Import local onboarding source and opt into `RevenueCatPaywall` on iOS/Android only; preserve slides and MMKV completion |
| `app/_layout.tsx` | Configure RevenueCat once without changing provider, Stack, or onboarding placement |
| `package.json` | Remove `react-native-onboarding-flow`; add exact RevenueCat packages, Expo-compatible Jest dependencies, `test`, and `typecheck` scripts |
| `bun.lockb` | Lock dependency changes using Bun |
| `README.md` | Document vendored source, public-key setup, dashboard prerequisites, development builds, and ownership boundaries |

### Remove

| File | Reason |
| --- | --- |
| `package-lock.json` | The repository uses Bun and the npm lockfile is already stale; keep one authoritative lockfile |

Do not remove `react-native-onboarding-flow` until the vendored parity tests and TypeScript check pass. The final change set must not retain both implementations.

## Dependency Plan

Use Bun as the repository's package manager because the current README, scripts, and latest dependency maintenance use it.

Production dependencies:

```text
react-native-purchases@10.4.3
react-native-purchases-ui@10.4.3
```

Both versions must remain exact because `react-native-purchases-ui@10.4.3` declares an exact peer dependency on `react-native-purchases@10.4.3`.

Test dependencies should be Expo 54 and React 19.1 compatible and selected through Expo where applicable:

```text
jest
jest-expo
@types/jest
react-test-renderer@19.1.0
@types/react-test-renderer
```

Required scripts:

```json
{
  "test": "jest",
  "typecheck": "tsc --noEmit"
}
```

Do not add `expo-av`; the current app uses image-only slides and the vendored source must preserve its optional dynamic-loading behavior.

## Lean Implementation Sequence

### 1. Vendor and Prove Parity

1. Copy upstream 1.5.2 production source and existing tests into `components/onboarding/src`.
2. Add the local barrel and provenance note.
3. Add Expo-compatible Jest tooling.
4. Switch `OnboardingGate` to the local import without enabling RevenueCat.
5. Run copied focused tests, typecheck, and an iOS Expo export.
6. Confirm the existing two-slide onboarding and MMKV completion behavior manually.

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
6. Extend flow tests for entry, completion, dismissal, and reopening.

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

1. Add app-owned platform-key configuration.
2. Call it once during native root startup and skip configuration on web.
3. Pass app-specific entitlement and optional placement identifiers from `OnboardingGate`.
4. Enable `showPaywall` only on iOS and Android.
5. Keep `handleComplete` as the only persistence path.
6. Add exact RevenueCat package versions with Bun.
7. Remove the external onboarding package and stale npm lockfile after parity passes.

### 5. Document and Verify

1. Add concise setup instructions to this app's README.
2. Run focused and full automated verification.
3. Perform a native development-build smoke test with test dashboard configuration.
4. Perform an independent read-only review for scope, privacy, and callback safety.

## Focused Tests

### OnboardingFlow

- Existing visible flow renders unchanged.
- Empty slides render nothing.
- Next advances slides.
- Final button without a paywall completes exactly once.
- Final button with a paywall enters the paywall without completing.
- Injected paywall completion completes exactly once.
- Injected dismissal returns to the final slide without completing.
- Final slide can reopen a freshly mounted paywall.
- Existing closeable behavior remains unchanged.

### RevenueCatPaywall

Mock only:

- `Purchases.getCustomerInfo`.
- `Purchases.getOfferings`.
- `Purchases.getCurrentOfferingForPlacement`.
- A lightweight `RevenueCatUI.Paywall` component that captures callback props.

Cover:

- Loading while preparation is pending.
- Existing configured entitlement completes once without rendering the paywall.
- An unrelated active entitlement does not complete.
- Placement Offering renders with `options.offering`.
- No placement uses `offerings.current`.
- Placement `null` shows failure and never fetches the current Offering as fallback.
- Missing current Offering shows failure.
- CustomerInfo and Offering rejection show failure.
- Retry can recover from failure.
- Back dismisses without completing.
- Purchase with the configured entitlement completes once.
- Purchase without it does not complete.
- Restore with the configured entitlement completes once.
- Restore without it does not complete.
- Cancellation and purchase/restore errors do not complete.
- Dismiss without entitlement dismisses once.
- Dismiss with entitlement completes instead.
- Dismissal CustomerInfo rejection dismisses without completing.
- Purchase followed by automatic RevenueCat dismissal does not duplicate callbacks.
- A dismissal recheck resolving after completion cannot dismiss.
- Superseded retry results cannot overwrite the newest state.
- Unmount during preparation or dismissal recheck causes no state updates or callbacks.

### OnboardingGate

- Existing persisted completion hides onboarding.
- Successful flow completion writes `onboarding_completed` and hides onboarding.
- Paywall dismissal does not write completion.
- Web uses the existing no-paywall completion path.

Do not test RevenueCat native internals or reproduce RevenueCat's own UI behavior in Jest.

## README Requirements

Keep documentation concise and app-specific. Include:

1. The onboarding source is vendored under `components/onboarding` and is intentionally edited locally.
2. RevenueCat package versions must match exactly.
3. Public iOS and Android SDK key environment variables.
4. RevenueCat configuration occurs at app startup, outside the paywall component.
5. Dashboard products, entitlement, Offering, paywall, and optional placement prerequisites.
6. `OnboardingGate` owns this app's identifiers and MMKV completion.
7. Purchase, restore, dismissal, and preparation failure behavior.
8. Expo Go Preview API Mode is useful for mock previews but cannot verify real purchases.
9. A new native development build is required after adding native packages.
10. Paywalls V2 close controls are configured in the RevenueCat dashboard.
11. Embedded paywalls do not support exit offers.
12. RevenueCat customer or transaction payloads must not be logged.

Do not add npm publication, code generation, automated upstream sync, generic workflow, or custom-screen guidance.

## Automated Verification

Run from the repository root after implementation:

```bash
bun run test -- --runInBand components/onboarding/src/__tests__/OnboardingFlow.test.tsx
bun run test -- --runInBand components/onboarding/src/__tests__/RevenueCatPaywall.test.tsx
bun run test -- --runInBand
bun run typecheck
bunx expo export --platform ios --output-dir /tmp/expo-local-first-paywall-ios-export
bun run build:web
```

The iOS export proves Metro can resolve the vendored source and RevenueCat native imports. Generated iOS export files stay outside the repository. The existing web export must still compile, but it does not prove web purchase support.

Automated pass conditions:

- Every command exits zero.
- Vendored parity tests remain green.
- Existing image-only behavior works without `expo-av`.
- No React `act()` or post-unmount warnings.
- Callback assertions prove terminal idempotency.
- No generated export files appear in git status.
- No secret or production RevenueCat credential is introduced.

## Native Development-Build Verification

Automated mocks and Expo exports cannot prove RevenueCat native UI or store behavior. In a configured development build:

1. Verify the existing onboarding visuals, modal layout, navigation, labels, progress, and animations.
2. Verify existing MMKV completion still suppresses onboarding after relaunch.
3. Verify the dashboard paywall fills the existing paywall container.
4. Dismiss and confirm the unchanged final slide returns when the dashboard paywall exposes dismissal.
5. Reopen the paywall.
6. Cancel a purchase and confirm onboarding does not complete.
7. Complete a sandbox purchase and confirm onboarding persists completion exactly once.
8. Restore an entitled account and confirm completion exactly once.
9. Restore an account without the configured entitlement and confirm no completion.
10. Test a placement configured as No Offering and confirm retry/back without fallback or completion.
11. Test missing/offline Offering preparation and confirm retry/back.
12. Confirm no private RevenueCat data appears in application logs.

Native prerequisites:

- Exact matching RevenueCat packages installed.
- A native development build created after installation.
- Public test platform SDK keys configured.
- Test products connected to the correct stores.
- Configured entitlement attached to those products.
- Published Offering and dashboard paywall.
- Placement configured when used.
- Dashboard paywall includes a close or back action when dismissal is expected.
- Sandbox StoreKit or Google Play tester account.

Expo Go may exercise RevenueCat Preview API Mode but is not accepted for these pass conditions.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Vendored source changes onboarding unintentionally | Copy first, run parity tests, then make only dismissal/paywall edits |
| App retains two onboarding implementations | Remove the npm package after local parity passes |
| Restore is treated as access without entitlement | Check the exact configured active entitlement |
| Purchase completion and automatic dismissal race | Recheck CustomerInfo and use one terminal outcome guard |
| Placement intentionally returns `null` | Do not fall back; use the common preparation failure state |
| SDK is not configured | Fail safely during preparation and document startup configuration |
| Native paywall load failures are overpromised | Limit the custom failure guarantee to detectable preparation failures |
| Expo Go creates false confidence | Require native development-build verification |
| RevenueCat package versions differ | Pin both packages to exact 10.4.3 |
| Dual lockfiles drift | Keep Bun as the single package manager and remove stale `package-lock.json` |
| Sensitive RevenueCat data is logged | Prohibit payload and identifier logging in code, tests, and docs |
| Web behavior regresses | Keep the existing web export as a compile gate; web purchases remain out of scope |
| Scope grows into a framework | Keep slides, storage, navigation, identifiers, and app policy outside reusable flow internals |

## Definition of Done

- The current onboarding UI and MMKV behavior are unchanged.
- The app imports onboarding only from vendored local source.
- The external onboarding package and stale npm lockfile are removed.
- Embedded RevenueCat dashboard paywall works through the existing full-screen slot.
- Purchase and restore require the configured active entitlement.
- Dismissal returns to the final slide when the dashboard provides a dismiss action.
- Detectable preparation failures never complete onboarding and support retry/back.
- Terminal callbacks are idempotent.
- Focused and full Jest tests pass.
- Strict TypeScript and Expo iOS/web exports pass.
- Native development-build smoke testing passes.
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
