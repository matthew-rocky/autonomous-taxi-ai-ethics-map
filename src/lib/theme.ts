import { useEffect, useState } from "react";

export type ThemePreference = "dark" | "glass-light" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const THEME_STORAGE_KEY = "ai-ethics-theme";
export const THEME_CHANGE_EVENT = "ai-ethics-theme-change";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "dark";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "dark" || value === "glass-light" || value === "system";
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? "dark" : "glass-light";
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return DEFAULT_THEME_PREFERENCE;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const resolvedTheme = resolveTheme(preference);

  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolvedTheme === "dark" ? "dark" : "light";
  }

  return resolvedTheme;
}

export function initializeThemePreference() {
  applyThemePreference(getStoredThemePreference());
}

export function setStoredThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The visual theme should still apply if storage is blocked.
  }

  const resolvedTheme = applyThemePreference(preference);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { preference, resolvedTheme } }));
}

function getThemeSnapshot() {
  const preference = getStoredThemePreference();
  return {
    preference,
    resolvedTheme: resolveTheme(preference),
  };
}

export function useThemePreference() {
  const [snapshot, setSnapshot] = useState(getThemeSnapshot);

  useEffect(() => {
    const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY);
    const syncTheme = () => {
      const preference = getStoredThemePreference();
      const resolvedTheme = applyThemePreference(preference);
      setSnapshot({ preference, resolvedTheme });
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) syncTheme();
    };

    syncTheme();
    mediaQuery.addEventListener("change", syncTheme);
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    window.addEventListener("storage", syncStorage);

    return () => {
      mediaQuery.removeEventListener("change", syncTheme);
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  return {
    ...snapshot,
    setPreference: setStoredThemePreference,
  };
}

export function useResolvedTheme() {
  return useThemePreference().resolvedTheme;
}
