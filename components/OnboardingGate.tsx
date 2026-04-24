"use client";

import { useApp } from "@/lib/AppContext";
import Onboarding from "./Onboarding";

export default function OnboardingGate() {
  const { onboardingDone } = useApp();
  if (onboardingDone) return null;
  return <Onboarding />;
}
