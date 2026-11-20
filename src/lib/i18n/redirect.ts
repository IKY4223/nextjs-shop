import { isLocale, type Locale } from "./locales";
import { pickLocale } from "./negotiate";

const SEGMENT_SEPARATOR = "/";

/**
 * Where a request without a locale prefix should go, or null when the path already starts
 * with a locale segment ("/uz", "/ru/..."). "/uzbek" is not a locale path: the prefix must be a whole segment.
 */
export function localeRedirectPath(
  pathname: string,
  search: string,
  cookieLang: string | undefined,
  acceptLanguage: string | null,
): string | null {
  const [, firstSegment = ""] = pathname.split(SEGMENT_SEPARATOR);
  if (isLocale(firstSegment)) return null;
  const lang = pickLocale(cookieLang, acceptLanguage);
  const rest = pathname === SEGMENT_SEPARATOR ? "" : pathname;
  return `/${lang}${rest}${search}`;
}

/** Same page under another locale: "/uz/c/cpu" → "/ru/c/cpu"; a locale-less path gets the prefix added. */
export function swapLocalePath(pathname: string, lang: Locale): string {
  const [, firstSegment = "", ...rest] = pathname.split(SEGMENT_SEPARATOR);
  const tail = isLocale(firstSegment) ? rest : [firstSegment, ...rest];
  return [`/${lang}`, ...tail.filter(Boolean)].join(SEGMENT_SEPARATOR);
}
