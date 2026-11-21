"use client";

import { useLayoutEffect } from "react";
import { themeFromCookie } from "@/lib/theme";

const LIGHT_QUERY = "(prefers-color-scheme: light)";

/**
 * Switching the language re-mounts <html> on the client without the data-theme attribute
 * that themeInitScript set on first load (inline scripts do not run again), so the page fell
 * back to dark. This restores it before paint whenever the layout mounts.
 */
export function ThemeSync(): null {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const theme = themeFromCookie(
      document.cookie,
      window.matchMedia(LIGHT_QUERY).matches,
    );
    if (root.dataset.theme !== theme) root.dataset.theme = theme;
  }, []);
  return null;
}
