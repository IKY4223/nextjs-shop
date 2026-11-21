export const THEME_COOKIE = "theme";
export const LANG_COOKIE = "lang";

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

const ONE_YEAR_SECONDS = 31_536_000;

/** Cookie string for a long-lived, site-wide preference (theme or language). */
export function preferenceCookie(name: string, value: string): string {
  return `${name}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

const COOKIE_SEPARATOR = ";";
const isTheme = (value: string | undefined): value is Theme =>
  value !== undefined && (THEMES as readonly string[]).includes(value);

/** Same rule as themeInitScript, for client code: cookie choice, else the OS preference, else dark. */
export function themeFromCookie(cookie: string, prefersLight: boolean): Theme {
  const saved = cookie
    .split(COOKIE_SEPARATOR)
    .map((part) => part.trim().split("="))
    .find(([name]) => name === THEME_COOKIE)?.[1];
  if (isTheme(saved)) return saved;
  return prefersLight ? "light" : "dark";
}

/**
 * Runs in <head> before first paint: cookie choice, else the OS preference, else dark.
 * The server never reads the theme cookie (that would make every page dynamic), so this script
 * is the only thing that sets data-theme on load — without it the page would flash the wrong theme.
 */
export const themeInitScript = `(function () {
  try {
    var m = document.cookie.match(/(?:^|; )${THEME_COOKIE}=(dark|light)/);
    var t = m
      ? m[1]
      : matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    document.documentElement.dataset.theme = t;
  } catch (e) {}
})();`;
