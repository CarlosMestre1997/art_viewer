"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Language } from "./types";
import { getFavorites, toggleFavorite as doToggle } from "./favorites";

interface AppContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  rotating: boolean;
  setRotating: (v: boolean) => void;
  infoLevel: "beginner" | "advanced";
  setInfoLevel: (v: "beginner" | "advanced") => void;
  onboardingDone: boolean;
  completeOnboarding: (intent: string) => void;
  userIntent: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [rotating, setRotating] = useState(false);
  const [infoLevel, setInfoLevel] = useState<"beginner" | "advanced">("beginner");
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [userIntent, setUserIntent] = useState("discover");

  useEffect(() => {
    setFavorites(getFavorites());
    const savedLang = localStorage.getItem("rc_lang") as Language | null;
    if (savedLang) setLangState(savedLang);
    const savedLevel = localStorage.getItem("rc_level") as "beginner" | "advanced" | null;
    if (savedLevel) setInfoLevel(savedLevel);
    const done = localStorage.getItem("rc_onboarding");
    if (!done) setOnboardingDone(false);
    const intent = localStorage.getItem("rc_intent");
    if (intent) setUserIntent(intent);
  }, []);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem("rc_lang", l);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(doToggle(id));
  }, []);

  const handleSetInfoLevel = useCallback((v: "beginner" | "advanced") => {
    setInfoLevel(v);
    localStorage.setItem("rc_level", v);
  }, []);

  const completeOnboarding = useCallback((intent: string) => {
    setUserIntent(intent);
    setOnboardingDone(true);
    localStorage.setItem("rc_onboarding", "1");
    localStorage.setItem("rc_intent", intent);
  }, []);

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        favorites,
        toggleFavorite,
        rotating,
        setRotating,
        infoLevel,
        setInfoLevel: handleSetInfoLevel,
        onboardingDone,
        completeOnboarding,
        userIntent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
