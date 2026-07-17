# Expo Local-first Template  [![Twitter](https://img.shields.io/twitter/url/https/twitter.com/cloudposse.svg?style=social&label=Follow%20%40expostarter)](https://twitter.com/expostarter)

[![Open in Bolt.new](https://www.expostarter.com/images/open-in-bolt.svg)](https://bolt.new/~/github.com/expo-starter/expo-local-first-template)

<p align="center">
  <a href="https://expostarter.com/"><img src="assets/github-banner.png?raw=true" alt="Expo Starter Kit"></a>
</p>

The `Expo Local-First Template` is a free project model with up-to-date frameworks and configurations for your new local-first Expo project.

If you're searching for a more production-ready template, consider purchasing the [Expo Starter Kit](https://expostarter.com). Your support will help us maintaining our free templates as well.

For local-first example with remote sync please check our [article](https://www.expostarter.com/blog/expo-libsql-improve-app-performance)

## 📚 What's inside

- ⚡ [Expo v54](https://expo.dev) - Built with Expo for cross-platform support
- ⚛️ [React Native v0.81.4](https://reactnative.dev) for building native apps using React
- 💽 Local-first based on [Expo SQLite for](https://docs.expo.dev/versions/latest/sdk/sqlite/) for native and [Sqlite.js](https://github.com/sql-js/sql.js) for Web
- 💽 Full integrated with [DrizzleORM](https://drizzle.dev) including live query
- 💎 Integrate with [NativeWind v4](https://www.nativewind.dev), Tailwind CSS for React Native
- 📦 [zustand](docs.pmnd.rs/zustand)
- 🎨 Common components from the [rn-reusables](https://github.com/mrzachnugent/react-native-reusables)
- 🌗 Dark and light mode - Android Navigation Bar matches mode and Persistant mode
- 📏 Linter and Code Formatter with [biome](https://biomejs.dev/)
- 🗂 VSCode recommended extensions, settings, and snippets to enhance the developer experience.



### Requirements

- Node.js 20+ and bun
- [iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Android Studio Emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- For Windows users: [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) is required


### Getting started

Run the following command on your local environment:

```shell
bunx create-expo-app --template https://github.com/expo-starter/expo-local-first-template
```

Then, you can run locally in development mode with live reload:

```shell
bun run dev:ios
# Or
bun run dev:android
```

<p align="center">
  <a href="https://expostarter.dev/"><img src="assets/preview-banner.png?raw=true" alt="React Native Expo Starter Kit"></a>
</p>

This will open the app in the iOS simulator or Android emulator.

### RevenueCat onboarding setup

This app vendors the onboarding source and the wired `components/OnboardingGate.tsx` integration intentionally. Edit them locally for this app; do not treat them as generated or auto-synced upstream code.

Use exact RevenueCat package versions:

- `react-native-purchases@10.4.3`
- `react-native-purchases-ui@10.4.3`

Configure public SDK keys through the app environment:

```shell
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=<public-ios-sdk-key>
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=<public-android-sdk-key>
```

RevenueCat is configured once at app startup through `configureRevenueCat()`, outside the paywall component. `OnboardingGate` owns this app's RevenueCat identifiers and MMKV onboarding-completion persistence.

Before testing purchases, configure RevenueCat dashboard products, entitlement, Offering, published Paywalls V2 paywall, optional placement, and store sandbox accounts. Paywalls V2 close controls are dashboard-owned. Embedded paywalls do not support exit offers.

Behavior to expect:

- Purchase success or restore with the configured entitlement completes onboarding once.
- Purchase cancellation, dismissal, missing entitlement, or preparation failure does not complete onboarding.
- Preparation failures show retry/back behavior; they should not fall back to a custom paywall.

Expo Go Preview API Mode is useful for a quick UI preview only. It cannot verify real purchases and is not production behavior. Create a new native development build after adding the native RevenueCat packages.

Security: never log RevenueCat customer, receipt, transaction, or other private purchase payloads. Public SDK key placeholders are required setup, not deviations.

### Contributions

Everyone is welcome to contribute to this project. Feel free to open an issue if you have question or found a bug. Totally open to any suggestions and improvements.

### License

See [LICENSE](LICENSE) for more information.

---

[Expo starter](expostarter.com) [![Twitter](https://img.shields.io/twitter/url/https/twitter.com/cloudposse.svg?style=social&label=Follow%20%40y0x53)](https://twitter.com/expostarter)
