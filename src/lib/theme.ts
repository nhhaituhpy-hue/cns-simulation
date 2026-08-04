export const APP_THEMES = ["light", "dark"] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export const DEFAULT_APP_THEME: AppTheme = "light";
export const APP_THEME_STORAGE_KEY = "cns-app-theme";

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === "string" && APP_THEMES.includes(value as AppTheme);
}
