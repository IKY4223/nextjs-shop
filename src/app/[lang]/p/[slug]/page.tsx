import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CategoryIcon } from "@/components/category-icon";
import { OfferList } from "@/components/offer-list";
import {
  productImageShare,
  productImageTransitionName,
} from "@/components/product-card";
import { SpecTable } from "@/components/spec-table";
import {
  getBreadcrumbs,
  getProduct,
  getProductSlugs,
} from "@/lib/catalog/data";
import { summarizeOffers } from "@/lib/catalog/filters";
import { localeAlternates } from "@/lib/i18n/alternates";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatPrice, pluralize } from "@/lib/i18n/format";
import { isLocale } from "@/lib/i18n/locales";

const PRICE_PLACEHOLDER = "{price}";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/p/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const detail = await getProduct(slug);
  if (!isLocale(lang) || !detail) return {};
  return {
    title: `${detail.product.brand} ${detail.product.name}`,
    alternates: localeAlternates(lang, `/p/${slug}`),
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/[lang]/p/[slug]">): Promise<React.JSX.Element> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, detail] = await Promise.all([
    getDictionary(lang),
    getProduct(slug),
  ]);
  if (!detail) notFound();
  const { product, category, offers } = detail;
  const crumbs = await getBreadcrumbs(category.slug);
  const summary = summarizeOffers(offers);
  const from = (price: number): string =>
    dict.catalog.offersFrom.replace(
      PRICE_PLACEHOLDER,
      formatPrice(price, lang),
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs
        lang={lang}
        crumbs={crumbs}
        dict={dict}
        current={product.name}
      />
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <ViewTransition
          name={productImageTransitionName(product.slug)}
          share={productImageShare}
          default="none"
        >
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-chip">
            {product.image ? (
              <Image
                src={product.image.src}
                alt={product.image.alt}
                width={800}
                height={600}
                priority
                className="h-full w-full object-contain"
              />
            ) : (
              <CategoryIcon
                icon={category.icon}
                className="size-32 text-muted"
              />
            )}
          </div>
        </ViewTransition>
        <div>
          <p className="text-sm text-muted">{product.brand}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
          <div className="mt-3 space-y-1">
            {summary.new && (
              <p className="text-accent">
                {dict.catalog.conditionNew} · {summary.new.count} ·{" "}
                <span className="font-semibold">
                  {from(summary.new.minPriceUzs)}
                </span>
              </p>
            )}
            {summary.used && (
              <p className="text-used">
                {dict.catalog.conditionUsed} · {summary.used.count} ·{" "}
                <span className="font-semibold">
                  {from(summary.used.minPriceUzs)}
                </span>
              </p>
            )}
          </div>
          <h2 className="mt-6 mb-2 text-lg font-semibold">
            {dict.product.specs}
          </h2>
          <SpecTable
            lang={lang}
            category={category}
            product={product}
            dict={dict}
          />
        </div>
      </div>
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">
          {dict.product.offers}{" "}
          <span className="text-sm font-normal text-muted">
            {offers.length}{" "}
            {pluralize(lang, offers.length, dict.product.offersCount)}
          </span>
        </h2>
        <OfferList lang={lang} offers={offers} dict={dict} />
      </section>
    </div>
  );
}
