export const locales = ["uz", "ru"] as const;

export type Locale = (typeof locales)[number];

export type Localized = Readonly<Record<Locale, string>>;

export const defaultLocale: Locale = "uz";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
