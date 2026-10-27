"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    listeners.delete(callback);
    media.removeEventListener("change", callback);
  };
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light");
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Penyimpanan diblokir (mode privat): tema tetap berlaku untuk sesi ini.
    }
    listeners.forEach((l) => l());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      className={`inline-flex items-center gap-2 min-h-[44px] px-3 rounded text-sm font-medium ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        )}
      </svg>
      {theme === "dark" ? "Mode terang" : "Mode gelap"}
    </button>
  );
}
