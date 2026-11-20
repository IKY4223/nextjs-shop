import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "./locales";

/** canonical + hreflang links for a path that exists in every locale (`path` starts with "/" or is ""). */
export function localeAlternates(
  lang: Locale,
  path: string,
): Metadata["alternates"] {
  return {
    canonical: `/${lang}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${defaultLocale}${path}`,
    },
  };
}
