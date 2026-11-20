import Link from "next/link";
import { lang as rootLang } from "next/root-params";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { defaultLocale, isLocale } from "@/lib/i18n/locales";

/** Shown for notFound() calls inside a locale (unknown category, product, offer). */
export default async function NotFound(): Promise<React.JSX.Element> {
  const value = await rootLang();
  const lang = isLocale(value) ? value : defaultLocale;
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{dict.notFound.title}</h1>
      <p className="mt-3 text-muted">{dict.notFound.text}</p>
      <Link
        href={`/${lang}`}
        className="mt-8 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-on-accent"
      >
        {dict.notFound.home}
      </Link>
    </div>
  );
}
