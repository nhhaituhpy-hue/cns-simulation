"use client";

import { Moon } from "@phosphor-icons/react/dist/csr/Moon";
import { Sun } from "@phosphor-icons/react/dist/csr/Sun";
import {
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME,
  isAppTheme,
  type AppTheme,
} from "@/lib/theme";

function readCurrentTheme(): AppTheme {
  const currentTheme = document.documentElement.dataset.theme;
  return isAppTheme(currentTheme) ? currentTheme : DEFAULT_APP_THEME;
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme still applies for this session when storage is unavailable.
  }
}

export function ThemeSwitcher() {
  function toggleTheme() {
    applyTheme(readCurrentTheme() === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Chuyển chế độ sáng/tối"
      title="Chuyển chế độ sáng/tối"
      className="group inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition-[background-color,border-color,color,transform] hover:border-[var(--accent-border)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-95 motion-reduce:transform-none"
    >
      <Sun
        aria-hidden
        size={21}
        weight="regular"
        className="theme-toggle-sun transition-transform duration-200 group-hover:rotate-12 motion-reduce:transform-none"
      />
      <Moon
        aria-hidden
        size={21}
        weight="regular"
        className="theme-toggle-moon transition-transform duration-200 group-hover:-rotate-12 motion-reduce:transform-none"
      />
    </button>
  );
}
