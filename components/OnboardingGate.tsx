import React, { useState } from "react";
import { OnboardingFlow, type OnboardingSlideData } from "react-native-onboarding-flow";
import { getItem, setItem } from "@/lib/storage";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

const slides: OnboardingSlideData[] = [
  {
    id: "welcome",
    media: {
      type: "image",
      source: require("@/assets/images/icon.png"),
      width: 220,
      height: 220,
      borderRadius: 24,
    },
    title: "Build better habits",
    description: "Create simple routines and keep your progress moving.",
    animation: "scaleIn",
  },
  {
    id: "ready",
    media: {
      type: "image",
      source: require("@/assets/images/splash.png"),
      width: 260,
      height: 180,
      borderRadius: 16,
    },
    title: "Start small",
    description: "Add your first habit and make today count.",
    animation: "fadeIn",
  },
];

export function OnboardingGate() {
  const [visible, setVisible] = useState(
    () => getItem<boolean>(ONBOARDING_COMPLETED_KEY) !== true,
  );

  const handleComplete = () => {
    setItem(ONBOARDING_COMPLETED_KEY, true);
    setVisible(false);
  };

  return (
    <OnboardingFlow
      slides={slides}
      visible={visible}
      onComplete={handleComplete}
      closeable={false}
      showProgress
    />
  );
}
