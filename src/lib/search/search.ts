import Fuse, { type FuseResult, type IFuseOptions } from "fuse.js";
import { offerInRange, type PricedOffer } from "@/lib/catalog/filters";
import type {
  Category,
  Facet,
  Offer,
  Product,
  SpecValue,
} from "@/lib/catalog/types";
import type { Locale } from "@/lib/i18n/locales";
import { compact, normalize } from "./normalize";
import type { ParsedQuery } from "./parse-query";
import { applyTermSynonyms } from "./synonyms";

export interface SearchDoc {
  readonly slug: string;
  readonly categorySlug: string;
  /** Matching form of "brand name". */
  readonly name: string;
  /** "Brand Name" as written, for display. */
  readonly displayName: string;
  /** Display brand. */
  readonly brand: string;
  /** Matching form of brand, category names, synonyms and spec values. */
  readonly keywords: string;
  /** Cheapest offer; in search results, the cheapest offer that matches the query's condition and price. */
  readonly minPriceUzs: number | null;
  /** Condition and price of every offer, so search applies the same offer rule as listings (spec §12.8). */
  readonly offers: readonly PricedOffer[];
  /** Root … own category slug, so a parent-category word narrows to its whole subtree. */
  readonly categoryPath: readonly string[];
}

/** Search-internal document: the doc plus derived matching fields. */
interface IndexedDoc {
  readonly doc: SearchDoc;
  readonly all: string;
  readonly nameCompact: string;
}

const DEFAULT_LIMIT = 20;
const SPACE = " ";
/** Fuse score: 0 = exact, 1 = anything. Tuned against search.eval.test.ts. */
const MATCH_THRESHOLD = 0.3;
const NAME_WEIGHT = 3;
const KEYWORDS_WEIGHT = 1;

const toMatching = (text: string): string => applyTermSynonyms(normalize(text));

const uniqueWords = (parts: readonly string[]): string =>
  [...new Set(parts.flatMap((p) => toMatching(p).split(SPACE)))]
    .filter(Boolean)
    .join(SPACE);

function specKeywords(facet: Facet, value: SpecValue | undefined): string[] {
  if (value === undefined) return [];
  if (facet.type === "enum") {
    const option = facet.options.find((o) => o.value === value);
    return [String(value), option?.label?.uz ?? "", option?.label?.ru ?? ""];
  }
  if (facet.type === "number") {
    const units = facet.unit ? [facet.unit.uz, facet.unit.ru] : [];
    return [String(value), ...units.map((u) => compact(`${value} ${u}`))];
  }
  return value === true ? [facet.label.uz, facet.label.ru] : [];
}

/** Slugs from the root down to `slug`; a broken parent link just ends the path. */
function categoryPathOf(
  slug: string,
  categories: readonly Category[],
): string[] {
  const climb = (
    cur: Category | undefined,
    seen: ReadonlySet<string>,
  ): string[] =>
    cur && !seen.has(cur.slug)
      ? [
          ...climb(
            categories.find((c) => c.slug === cur.parentSlug),
            new Set([...seen, cur.slug]),
          ),
          cur.slug,
        ]
      : [];
  const path = climb(
    categories.find((c) => c.slug === slug),
    new Set(),
  );
  return path.length ? path : [slug];
}

export function buildSearchIndex(
  products: readonly Product[],
  offers: readonly Offer[],
  categories: readonly Category[],
): SearchDoc[] {
  const offersByProduct = Map.groupBy(offers, (o) => o.productId);
  return products.map((p) => {
    const category = categories.find((c) => c.slug === p.categorySlug);
    const own = offersByProduct.get(p.id) ?? [];
    const prices = own.map((o) => o.priceUzs);
    return {
      offers: own.map((o) => ({
        condition: o.condition,
        priceUzs: o.priceUzs,
      })),
      categoryPath: categoryPathOf(p.categorySlug, categories),
      slug: p.slug,
      categorySlug: p.categorySlug,
      name: toMatching(`${p.brand} ${p.name}`),
      displayName: `${p.brand} ${p.name}`,
      brand: p.brand,
      keywords: uniqueWords([
        p.brand,
        category?.name.uz ?? "",
        category?.name.ru ?? "",
        ...(category?.searchSynonyms ?? []),
        ...(category?.facets ?? []).flatMap((f) =>
          specKeywords(f, p.specs[f.key]),
        ),
      ]),
      minPriceUzs: prices.length ? Math.min(...prices) : null,
    };
  });
}

const tokenOptions: IFuseOptions<IndexedDoc> = {
  keys: [
    { name: "doc.name", weight: NAME_WEIGHT },
    { name: "all", weight: KEYWORDS_WEIGHT },
  ],
  // space-separated terms are AND-ed, each matched fuzzily
  useExtendedSearch: true,
  ignoreLocation: true,
  includeScore: true,
  threshold: MATCH_THRESHOLD,
};

const compactOptions: IFuseOptions<IndexedDoc> = {
  keys: ["nameCompact"],
  ignoreLocation: true,
  includeScore: true,
  threshold: MATCH_THRESHOLD,
};

const byPrice = (a: SearchDoc, b: SearchDoc): number =>
  (a.minPriceUzs ?? Number.MAX_SAFE_INTEGER) -
  (b.minPriceUzs ?? Number.MAX_SAFE_INTEGER);

/** Best (lowest) score per slug across both searches. */
function mergeByBestScore(
  results: readonly FuseResult<IndexedDoc>[],
): SearchDoc[] {
  const best = results.reduce<ReadonlyMap<string, FuseResult<IndexedDoc>>>(
    (acc, r) => {
      const prev = acc.get(r.item.doc.slug);
      return prev && (prev.score ?? 1) <= (r.score ?? 1)
        ? acc
        : new Map(acc).set(r.item.doc.slug, r);
    },
    new Map(),
  );
  return [...best.values()]
    .toSorted((a, b) => (a.score ?? 1) - (b.score ?? 1))
    .map((r) => r.item.doc);
}

/** Text search within the parsed category; an empty text lists the category by price. */
export function searchProducts(
  index: readonly SearchDoc[],
  parsed: ParsedQuery,
  limit: number = DEFAULT_LIMIT,
): SearchDoc[] {
  const conditions = parsed.condition ? [parsed.condition] : [];
  // Category (any ancestor counts), condition and price narrow the pool before text search;
  // each kept doc is re-priced by its cheapest matching offer, so "от X" agrees with the chips.
  const pool = index
    .filter(
      (d) =>
        !parsed.categorySlug || d.categoryPath.includes(parsed.categorySlug),
    )
    .flatMap((d) => {
      const prices = d.offers
        .filter((o) =>
          offerInRange(o, conditions, parsed.priceMin, parsed.priceMax),
        )
        .map((o) => o.priceUzs);
      return prices.length ? [{ ...d, minPriceUzs: Math.min(...prices) }] : [];
    });
  if (!parsed.text) {
    return parsed.categorySlug ? pool.toSorted(byPrice).slice(0, limit) : [];
  }
  const docs: IndexedDoc[] = pool.map((doc) => ({
    doc,
    all: `${doc.name} ${doc.keywords}`,
    nameCompact: doc.name.split(SPACE).join(""),
  }));
  const tokenHits = new Fuse(docs, tokenOptions).search(parsed.text);
  const compactHits = new Fuse(docs, compactOptions).search(
    compact(parsed.text),
  );
  return mergeByBestScore([...tokenHits, ...compactHits]).slice(0, limit);
}

/** Where Enter in the search dialog goes (spec §12.10). */
export function buildSearchUrl(
  lang: Locale,
  parsed: ParsedQuery,
  hits: readonly SearchDoc[],
): string {
  const entries: [string, string][] = [
    ["condition", parsed.condition ?? ""],
    ["priceMin", parsed.priceMin === null ? "" : String(parsed.priceMin)],
    ["priceMax", parsed.priceMax === null ? "" : String(parsed.priceMax)],
    ["q", parsed.text],
  ];
  const params = new URLSearchParams(entries.filter(([, value]) => value));
  const hitCategories = new Set(hits.map((h) => h.categorySlug));
  const [onlyHitCategory] = hitCategories;
  const category =
    parsed.categorySlug ?? (hitCategories.size === 1 ? onlyHitCategory : null);
  const path = category ? `/${lang}/c/${category}` : `/${lang}/search`;
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
