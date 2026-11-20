"use client";

import { preferenceCookie, THEME_COOKIE, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

const opposite: Readonly<Record<Theme, Theme>> = {
  dark: "light",
  light: "dark",
};

export function ThemeToggle({
  label,
}: {
  readonly label: string;
}): React.JSX.Element {
  const toggle = (): void => {
    const root = document.documentElement;
    const current: Theme = root.dataset.theme === "light" ? "light" : "dark";
    const next = opposite[current];
    root.dataset.theme = next;
    document.cookie = preferenceCookie(THEME_COOKIE, next);
  };

  // Both icons render; CSS shows the right one, so server and client markup always match.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="rounded-lg p-2 text-muted hover:bg-chip hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </button>
  );
}
