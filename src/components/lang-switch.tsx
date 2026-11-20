"use client";

import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/locales";
import { swapLocalePath } from "@/lib/i18n/redirect";
import { LANG_COOKIE, preferenceCookie } from "@/lib/theme";

export function LangSwitch({
  lang,
  label,
  ariaLabel,
}: {
  readonly lang: Locale;
  readonly label: string;
  readonly ariaLabel: string;
}): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const other = locales.find((l) => l !== lang) ?? defaultLocale;
  const target = swapLocalePath(pathname, other);

  // Query string is read at click time, so this component needs no useSearchParams (and no Suspense).
  const go = (event: MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    document.cookie = preferenceCookie(LANG_COOKIE, other);
    router.push(`${target}${window.location.search}`);
  };

  return (
    <a
      href={target}
      hrefLang={other}
      lang={other}
      onClick={go}
      aria-label={ariaLabel}
      className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-chip hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
    >
      {label}
    </a>
  );
}
