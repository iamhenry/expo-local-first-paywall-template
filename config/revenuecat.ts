import { Platform } from "react-native";
import Purchases from "react-native-purchases";

declare const process: {
  env: {
    EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?: string;
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?: string;
  };
};

let isConfigured = false;

const placeholderMarkers = [
  "placeholder",
  "replace",
  "todo",
  "example",
  "your_",
  "your-",
];

const isPlaceholderKey = (key: string) => {
  const normalized = key.trim().toLowerCase();

  return placeholderMarkers.some((marker) => normalized.includes(marker));
};

const getPlatformApiKey = () => {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  }

  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  }

  return undefined;
};

export const configureRevenueCat = () => {
  if (isConfigured || Platform.OS === "web") {
    return;
  }

  const apiKey = getPlatformApiKey()?.trim();

  if (!apiKey || isPlaceholderKey(apiKey)) {
    return;
  }

  Purchases.configure({ apiKey });
  isConfigured = true;
};
