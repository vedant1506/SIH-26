/**
 * Theme Manager — SIH26103
 * Handles persistent light/dark mode using localStorage + data-theme attribute.
 * Apply `data-theme="light"` on <html> for light mode (no class needed).
 */

export type Theme = "dark" | "light";

const STORAGE_KEY = "prism-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(STORAGE_KEY) as Theme) || "dark";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.setAttribute("data-theme", "light");
    root.classList.add("light-mode");
    root.classList.remove("dark-mode");
  } else {
    root.removeAttribute("data-theme");
    root.classList.remove("light-mode");
    root.classList.add("dark-mode");
  }
}

export function toggleTheme(): Theme {
  const current = getStoredTheme();
  const next: Theme = current === "dark" ? "light" : "dark";
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  return next;
}

export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}
