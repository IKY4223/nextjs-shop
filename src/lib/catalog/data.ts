/**
 * The only module that knows where catalog data comes from. Pages and components call these
 * async functions; swapping the mocks for Prisma later changes this file alone.
 */
import { parseQuery } from "@/lib/search/parse-query";
import {
  buildSearchIndex,
  searchProducts,
  type SearchDoc,
} from "@/lib/search/search";
import { categories } from "./categories";
import { applyFilters, type Filters, type ProductListing } from "./filters";
import { mockOffers } from "./mock/offers";
import { mockProducts } from "./mock/products";
import type { Category, Offer, Product, ProductImage } from "./types";

export interface ProductDetail {
  readonly product: Product;
  readonly category: Category;
  /** Every offer of the product, cheapest first. */
  readonly offers: readonly Offer[];
}

export interface OfferDetail {
  readonly offer: Offer;
  readonly product: Product;
}

export interface PhotoCredit {
  readonly product: Product;
  readonly image: ProductImage;
}

/** Upper bound for search hits fed into a listing; the whole stage-1 catalog fits. */
const SEARCH_HIT_LIMIT = 200;

const searchIndex: readonly SearchDoc[] = buildSearchIndex(
  mockProducts,
  mockOffers,
  categories,
);

const byPriceAsc = (a: Offer, b: Offer): number => a.priceUzs - b.priceUzs;

export async function getCategories(): Promise<readonly Category[]> {
  return categories;
}

export async function getCategory(slug: string): Promise<Category | null> {
  return categories.find((c) => c.slug === slug) ?? null;
}

/** Children of `parentSlug`; `null` gives the roots. */
export async function getChildCategories(
  parentSlug: string | null,
): Promise<Category[]> {
  return categories.filter((c) => c.parentSlug === parentSlug);
}

export async function getLeafCategories(): Promise<Category[]> {
  return categories.filter(
    (c) => !categories.some((child) => child.parentSlug === c.slug),
  );
}

/** Root … self; empty for an unknown slug. */
export async function getBreadcrumbs(slug: string): Promise<Category[]> {
  const climb = (cur: Category | undefined): Category[] =>
    cur
      ? [...climb(categories.find((c) => c.slug === cur.parentSlug)), cur]
      : [];
  return climb(categories.find((c) => c.slug === slug));
}

/** Products of one category (or all when `null`), narrowed by search text, then by filters. */
export async function listProducts(
  categorySlug: string | null,
  filters: Filters,
): Promise<ProductListing[]> {
  if (categorySlug !== null && !(await getCategory(categorySlug))) return [];
  const inCategory =
    categorySlug === null
      ? mockProducts
      : mockProducts.filter((p) => p.categorySlug === categorySlug);
  if (!filters.q) return applyFilters(inCategory, mockOffers, filters);

  const parsed = parseQuery(filters.q, categories);
  const hits = searchProducts(
    searchIndex,
    { ...parsed, categorySlug: categorySlug ?? parsed.categorySlug },
    SEARCH_HIT_LIMIT,
  );
  const bySlug = new Map(inCategory.map((p) => [p.slug, p]));
  const ranked = hits
    .map((h) => bySlug.get(h.slug))
    .filter((p): p is Product => p !== undefined);
  return applyFilters(ranked, mockOffers, filters);
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  const product = mockProducts.find((p) => p.slug === slug);
  const category = categories.find((c) => c.slug === product?.categorySlug);
  if (!product || !category) return null;
  return {
    product,
    category,
    offers: mockOffers
      .filter((o) => o.productId === product.id)
      .toSorted(byPriceAsc),
  };
}

export async function getOffer(id: string): Promise<OfferDetail | null> {
  const offer = mockOffers.find((o) => o.id === id);
  const product = mockProducts.find((p) => p.id === offer?.productId);
  return offer && product ? { offer, product } : null;
}

export async function getSearchIndex(): Promise<readonly SearchDoc[]> {
  return searchIndex;
}

export async function getProductSlugs(): Promise<string[]> {
  return mockProducts.map((p) => p.slug);
}

export async function getOfferIds(): Promise<string[]> {
  return mockOffers.map((o) => o.id);
}

/** Every brand in the category, regardless of active filters, so ticking one never hides the others. */
export async function getCategoryBrands(slug: string): Promise<string[]> {
  return [
    ...new Set(
      mockProducts.filter((p) => p.categorySlug === slug).map((p) => p.brand),
    ),
  ].toSorted();
}

export async function getPhotoCredits(): Promise<PhotoCredit[]> {
  return mockProducts.flatMap((product) =>
    product.image ? [{ product, image: product.image }] : [],
  );
}
