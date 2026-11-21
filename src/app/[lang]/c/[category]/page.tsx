import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CategoryTile } from "@/components/category-tile";
import { EmptyState } from "@/components/empty-state";
import { FilterPanel } from "@/components/filter-panel";
import { GridSkeleton } from "@/components/grid-skeleton";
import { ProductCard } from "@/components/product-card";
import { QueryChips } from "@/components/query-chips";
import { SortSelect } from "@/components/sort-select";
import {
  getBreadcrumbs,
  getCategories,
  getCategory,
  getCategoryBrands,
  getChildCategories,
  listProducts,
} from "@/lib/catalog/data";
import { parseFilters, type SearchParamsRecord } from "@/lib/catalog/filters";
import type { Category } from "@/lib/catalog/types";
import { localeAlternates } from "@/lib/i18n/alternates";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { pluralize } from "@/lib/i18n/format";
import { isLocale, type Locale } from "@/lib/i18n/locales";

export async function generateStaticParams(): Promise<{ category: string }[]> {
  const categories = await getCategories();
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/c/[category]">): Promise<Metadata> {
  const { lang, category: slug } = await params;
  const category = await getCategory(slug);
  if (!isLocale(lang) || !category) return {};
  return {
    title: category.name[lang],
    alternates: localeAlternates(lang, `/c/${slug}`),
  };
}

/** Reads searchParams, so it streams inside Suspense; the breadcrumbs and title above stay in the static shell. */
async function Listing({
  lang,
  category,
  dict,
  searchParams,
}: {
  readonly lang: Locale;
  readonly category: Category;
  readonly dict: Dictionary;
  readonly searchParams: Promise<SearchParamsRecord>;
}): Promise<React.JSX.Element> {
  const filters = parseFilters(category, await searchParams);
  const [listings, brands, categories] = await Promise.all([
    listProducts(category.slug, filters),
    getCategoryBrands(category.slug),
    getCategories(),
  ]);
  const basePath = `/${lang}/c/${category.slug}`;
  // on a parent page the products come from several leaves: each card needs its own category
  const categoryOf = (slug: string): Category =>
    categories.find((c) => c.slug === slug) ?? category;

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-[15rem_1fr]">
      <FilterPanel
        lang={lang}
        category={category}
        brands={brands}
        filters={filters}
        dict={dict.catalog}
      />
      <section>
        <QueryChips
          lang={lang}
          basePath={basePath}
          filters={filters}
          dict={dict}
          category={category}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-muted">
            {listings.length}{" "}
            {pluralize(lang, listings.length, dict.catalog.results)}
          </p>
          <SortSelect
            basePath={basePath}
            category={category}
            filters={filters}
            dict={dict.catalog}
          />
        </div>
        {listings.length ? (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <li key={listing.product.slug}>
                <ProductCard
                  lang={lang}
                  listing={listing}
                  category={categoryOf(listing.product.categorySlug)}
                  dict={dict}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={dict.catalog.emptyTitle}
            text={dict.catalog.emptyText}
            resetLabel={dict.catalog.reset}
            resetHref={basePath}
          />
        )}
      </section>
    </div>
  );
}

/**
 * A parent page is a set of tiles (spec §12.11), but a search that names the parent ("комплектующие asus")
 * lands here with q: then the matching products of the whole subtree are listed under the tiles.
 */
async function ParentSearch(props: {
  readonly lang: Locale;
  readonly category: Category;
  readonly dict: Dictionary;
  readonly searchParams: Promise<SearchParamsRecord>;
}): Promise<React.JSX.Element | null> {
  const { q } = parseFilters(props.category, await props.searchParams);
  return q ? <Listing {...props} /> : null;
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[lang]/c/[category]">): Promise<React.JSX.Element> {
  const { lang, category: slug } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, category, crumbs, children] = await Promise.all([
    getDictionary(lang),
    getCategory(slug),
    getBreadcrumbs(slug),
    getChildCategories(slug),
  ]);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs lang={lang} crumbs={crumbs} dict={dict} />
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
        {category.name[lang]}
      </h1>
      {children.length ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {children.map((child) => (
              <CategoryTile key={child.slug} lang={lang} category={child} />
            ))}
          </div>
          <Suspense fallback={null}>
            <ParentSearch
              lang={lang}
              category={category}
              dict={dict}
              searchParams={searchParams}
            />
          </Suspense>
        </>
      ) : (
        <Suspense fallback={<GridSkeleton />}>
          <Listing
            lang={lang}
            category={category}
            dict={dict}
            searchParams={searchParams}
          />
        </Suspense>
      )}
    </div>
  );
}
