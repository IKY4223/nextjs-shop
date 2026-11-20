import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOffer, getOfferIds } from "@/lib/catalog/data";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";

export async function generateStaticParams(): Promise<{ offerId: string }[]> {
  const ids = await getOfferIds();
  return ids.map((offerId) => ({ offerId }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/go/[offerId]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  // a stub per offer: nothing here for search engines to index
  return { title: dict.go.title, robots: { index: false, follow: true } };
}

/** Demo stand-in for "go to the seller's listing" until real, legally obtained listings exist (spec §4, §12.12). */
export default async function GoToSellerPage({
  params,
}: PageProps<"/[lang]/go/[offerId]">): Promise<React.JSX.Element> {
  const { lang, offerId } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, found] = await Promise.all([
    getDictionary(lang),
    getOffer(offerId),
  ]);
  if (!found) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-lg">{dict.go.text}</p>
      <p className="mt-2 text-sm text-muted">
        {found.offer.source.name} · {found.product.brand} {found.product.name}
      </p>
      <Link
        href={`/${lang}/p/${found.product.slug}`}
        className="mt-8 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-on-accent"
      >
        {dict.go.back}
      </Link>
    </div>
  );
}
