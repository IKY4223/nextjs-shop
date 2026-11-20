import type { Locale } from "./locales";

const NBSP = "\u00A0";

const CURRENCY_WORD: Readonly<Record<Locale, string>> = {
  uz: "so\u02BBm",
  ru: "сум",
};

const digitGrouping = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

/**
 * Integer UZS amount, e.g. "4 500 000 so\u02BBm".
 * Not Intl currency style: its output differs between ICU versions (Node vs browsers),
 * which would break hydration. Separators are forced to U+00A0 for the same reason.
 */
export function formatPrice(amountUzs: number, lang: Locale): string {
  // Any whitespace (ICU may emit U+00A0 or U+202F between groups) becomes U+00A0.
  // "4 500 000" (narrow no-break spaces) → "4 500 000" (U+00A0); "4500" is unchanged.
  // https://regex101.com/?flavor=javascript&regex=%5Cs&flags=g&testString=4%E2%80%AF500%E2%80%AF000%0A4500
  const digits = digitGrouping.format(amountUzs).replace(/\s/g, NBSP);
  return `${digits}${NBSP}${CURRENCY_WORD[lang]}`;
}

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
  readonly other: string;
};

const pluralRules: Readonly<Record<Locale, Intl.PluralRules>> = {
  uz: new Intl.PluralRules("uz"),
  ru: new Intl.PluralRules("ru"),
};

export function pluralize(lang: Locale, n: number, forms: PluralForms): string {
  return forms[pluralRules[lang].select(n)] ?? forms.other;
}

const dateFormatters: Readonly<Record<Locale, Intl.DateTimeFormat>> = {
  // UTC: the ISO date is a calendar day, not an instant; local zones must not shift it
  uz: new Intl.DateTimeFormat("uz", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  ru: new Intl.DateTimeFormat("ru", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
};

/** "2026-11-12" → "12 ноября 2026 г." / "12-noyabr, 2026"; an unparseable string is returned as is. */
export function formatDate(isoDate: string, lang: Locale): string {
  const time = Date.parse(isoDate);
  return Number.isNaN(time)
    ? isoDate
    : dateFormatters[lang].format(new Date(time));
}
