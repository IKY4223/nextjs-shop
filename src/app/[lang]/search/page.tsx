import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { GridSkeleton } from "@/components/grid-skeleton";
import { ProductCard } from "@/components/product-card";
import { QueryChips } from "@/components/query-chips";
import { SortSelect } from "@/components/sort-select";
import { getCategories, listProducts } from "@/lib/catalog/data";
import { parseFilters, type SearchParamsRecord } from "@/lib/catalog/filters";
import { localeAlternates } from "@/lib/i18n/alternates";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { pluralize } from "@/lib/i18n/format";
import { isLocale, type Locale } from "@/lib/i18n/locales";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/search">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.search.title,
    alternates: localeAlternates(lang, "/search"),
    // result pages for arbitrary queries are not worth indexing
    robots: { index: false, follow: true },
  };
}

async function SearchResults({
  lang,
  dict,
  searchParams,
}: {
  readonly lang: Locale;
  readonly dict: Dictionary;
  readonly searchParams: Promise<SearchParamsRecord>;
}): Promise<React.JSX.Element> {
  const filters = parseFilters(null, await searchParams);
  const [listings, categories] = await Promise.all([
    listProducts(null, filters),
    getCategories(),
  ]);
  const basePath = `/${lang}/search`;
  const cards = listings.flatMap((listing) => {
    const category = categories.find(
      (c) => c.slug === listing.product.categorySlug,
    );
    return category ? [{ listing, category }] : [];
  });

  return (
    <>
      <QueryChips
        lang={lang}
        basePath={basePath}
        filters={filters}
        dict={dict}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {cards.length} {pluralize(lang, cards.length, dict.catalog.results)}
        </p>
        <SortSelect
          basePath={basePath}
          category={null}
          filters={filters}
          dict={dict.catalog}
        />
      </div>
      {cards.length ? (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ listing, category }) => (
            <li key={listing.product.slug}>
              <ProductCard
                lang={lang}
                listing={listing}
                category={category}
                dict={dict}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={dict.search.noResults}
          text={dict.catalog.emptyText}
          resetLabel={dict.catalog.reset}
          resetHref={basePath}
        />
      )}
    </>
  );
}

/** Enter in the search dialog lands here when the query spans several categories (spec §12.10). */
export default async function SearchPage({
  params,
  searchParams,
}: PageProps<"/[lang]/search">): Promise<React.JSX.Element> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{dict.search.title}</h1>
      <Suspense fallback={<GridSkeleton />}>
        <SearchResults lang={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
