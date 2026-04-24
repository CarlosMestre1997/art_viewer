"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";

interface Props {
  artworkId: string;
  artworkTitle: string;
  onClose: () => void;
}

export default function InterestModal({ artworkId, artworkTitle, onClose }: Props) {
  const { lang } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const interests = JSON.parse(localStorage.getItem("rc_interests") ?? "[]");
    interests.push({ artworkId, artworkTitle, name, email, message, ts: Date.now() });
    localStorage.setItem("rc_interests", JSON.stringify(interests));
    setSent(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 shadow-2xl z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
        >
          <X size={20} />
        </button>

        {sent ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✓</div>
            <p className="font-semibold text-stone-900">{t(lang, "sent")}</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-stone-900 mb-1">{t(lang, "interest_title")}</h2>
            <p className="text-sm text-stone-500 mb-4">{t(lang, "interest_desc")}</p>
            <p className="text-xs text-stone-400 bg-stone-50 px-3 py-2 rounded-lg mb-4 font-medium">
              {artworkTitle}
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder={t(lang, "your_name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300"
              />
              <input
                type="email"
                required
                placeholder={t(lang, "your_email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300"
              />
              <textarea
                rows={3}
                placeholder={t(lang, "your_message")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300 resize-none"
              />
              <button
                type="submit"
                className="w-full bg-stone-900 text-white font-semibold py-3.5 rounded-xl hover:bg-stone-700 transition-colors"
              >
                {t(lang, "send")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
