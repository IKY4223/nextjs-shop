import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPhotoCredits } from "@/lib/catalog/data";
import { localeAlternates } from "@/lib/i18n/alternates";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/credits">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.credits.title,
    alternates: localeAlternates(lang, "/credits"),
  };
}

/** The only place photo attribution appears (no captions under photos, as the user asked). */
export default async function CreditsPage({
  params,
}: PageProps<"/[lang]/credits">): Promise<React.JSX.Element> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, credits] = await Promise.all([
    getDictionary(lang),
    getPhotoCredits(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">{dict.credits.title}</h1>
      {credits.length ? (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface text-sm">
          {credits.map(({ product, image }) => (
            <li key={product.slug} className="p-4">
              <p className="font-medium">
                {product.brand} {product.name}
              </p>
              <p className="mt-1 text-muted">
                {dict.credits.author}: {image.author} · {dict.credits.license}:{" "}
                <a href={image.licenseUrl} className="text-accent underline">
                  {image.license}
                </a>{" "}
                ·{" "}
                <a href={image.sourceUrl} className="text-accent underline">
                  {dict.credits.source}
                </a>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-muted">{dict.credits.empty}</p>
      )}
    </div>
  );
}
