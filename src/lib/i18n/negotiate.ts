import { defaultLocale, isLocale, type Locale } from "./locales";

interface LanguageRange {
  readonly tag: string;
  readonly quality: number;
}

const DEFAULT_QUALITY = 1;
const QUALITY_PREFIX = "q=";

// BCP 47-ish language tag, already lower-cased: primary subtag of 2–8 letters plus optional subtags.
// Matches "uz-cyrl-uz" and "ru"; rejects "q=,," and "" (empty).
// https://regex101.com/?flavor=javascript&regex=%5E%5Ba-z%5D%7B2%2C8%7D(-%5Ba-z0-9%5D%7B1%2C8%7D)*%24&flags=gm&testString=uz-cyrl-uz%0Aru%0Aq%3D%2C%2C%0A
const LANGUAGE_TAG = /^[a-z]{2,8}(-[a-z0-9]{1,8})*$/;

function parseRange(part: string): LanguageRange | null {
  const [rawTag = "", ...params] = part.trim().split(";");
  const tag = rawTag.trim().toLowerCase();
  if (!LANGUAGE_TAG.test(tag)) return null;
  const qParam = params
    .map((p) => p.trim())
    .find((p) => p.startsWith(QUALITY_PREFIX));
  const quality = qParam
    ? Number.parseFloat(qParam.slice(QUALITY_PREFIX.length))
    : DEFAULT_QUALITY;
  return Number.isFinite(quality) ? { tag, quality } : null;
}

function primarySubtag(tag: string): string {
  return tag.split("-")[0] ?? "";
}

/** Cookie choice first, then the browser's Accept-Language (by q), then the default. */
export function pickLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (cookieValue && isLocale(cookieValue)) return cookieValue;
  if (!acceptLanguage) return defaultLocale;

  const best = acceptLanguage
    .split(",")
    .map(parseRange)
    .filter((range): range is LanguageRange => range !== null)
    .sort((a, b) => b.quality - a.quality)
    .map((range) => primarySubtag(range.tag))
    .find(isLocale);
  return best ?? defaultLocale;
}
