"use client";

import { useState } from "react";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";

const INTENTS = ["discover", "buy", "learn", "gift"] as const;
const INTENT_KEYS = {
  discover: "opt_discover",
  buy: "opt_buy",
  learn: "opt_learn",
  gift: "opt_gift",
} as const;

export default function Onboarding() {
  const { lang, setLang, completeOnboarding } = useApp();
  const [selected, setSelected] = useState<string>("discover");

  return (
    <div className="fixed inset-0 z-50 bg-stone-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-white/50 text-xs uppercase tracking-widest mb-2 font-medium">
          {t(lang, "appName")} · {t(lang, "tagline")}
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">{t(lang, "onboarding_title")}</h1>
        <p className="text-white/60 text-sm mb-8">{t(lang, "onboarding_q")}</p>

        <div className="flex flex-col gap-3 mb-8">
          {INTENTS.map((intent) => (
            <button
              key={intent}
              onClick={() => setSelected(intent)}
              className={`w-full text-left px-5 py-4 rounded-2xl font-medium text-base transition-all ${
                selected === intent
                  ? "bg-white text-stone-900"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {t(lang, INTENT_KEYS[intent])}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setLang("en")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              lang === "en" ? "bg-white text-stone-900" : "bg-white/10 text-white"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang("lv")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              lang === "lv" ? "bg-white text-stone-900" : "bg-white/10 text-white"
            }`}
          >
            Latviešu
          </button>
        </div>

        <button
          onClick={() => completeOnboarding(selected)}
          className="w-full bg-white text-stone-900 font-bold py-4 rounded-2xl text-base hover:bg-stone-100 transition-colors"
        >
          {t(lang, "continue")} →
        </button>
      </div>
    </div>
  );
}
