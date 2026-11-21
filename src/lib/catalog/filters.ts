import type {
  Category,
  Condition,
  Facet,
  Offer,
  Product,
  SpecValue,
} from "./types";

export const SORT_KEYS = ["relevance", "price-asc", "price-desc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface Filters {
  /** Facet key → selected values; OR within one facet, AND across facets. Keys without values are absent. */
  readonly facets: Readonly<Record<string, readonly SpecValue[]>>;
  readonly brands: readonly string[];
  /** Empty = any condition. */
  readonly conditions: readonly Condition[];
  readonly priceMin: number | null;
  readonly priceMax: number | null;
  readonly sort: SortKey;
  readonly q: string;
}

export interface OfferSummary {
  readonly count: number;
  readonly minPriceUzs: number;
}

export interface OfferSummaries {
  readonly new: OfferSummary | null;
  readonly used: OfferSummary | null;
}

export interface ProductListing extends OfferSummaries {
  readonly product: Product;
}

export type SearchParamsRecord = Readonly<
  Record<string, string | string[] | undefined>
>;

const CONDITIONS: readonly Condition[] = ["new", "used"];
const LIST_SEPARATOR = ",";
const BOOLEAN_PARAM = "1";
const TRUE_PARAMS: readonly string[] = [BOOLEAN_PARAM, "true"];

const isCondition = (value: string): value is Condition =>
  (CONDITIONS as readonly string[]).includes(value);
const isSortKey = (value: string | undefined): value is SortKey =>
  value !== undefined && (SORT_KEYS as readonly string[]).includes(value);
const defaultSort = (q: string): SortKey => (q ? "relevance" : "price-asc");
const unique = <TValue>(values: readonly TValue[]): TValue[] => [
  ...new Set(values),
];

function firstParam(
  params: SearchParamsRecord,
  key: string,
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** All comma-separated values of a (possibly repeated) param, trimmed, non-empty, de-duplicated. */
function listParam(params: SearchParamsRecord, key: string): string[] {
  const value = params[key];
  const raw = Array.isArray(value) ? value : [value ?? ""];
  return unique(
    raw
      .flatMap((part) => part.split(LIST_SEPARATOR))
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

/** Whole, non-negative, safe integer; anything else (decimals, "1e30", "-5", "") is null. */
function parseCount(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

const facetParsers: {
  readonly [TType in Facet["type"]]: (
    facet: Extract<Facet, { type: TType }>,
    raw: string,
  ) => SpecValue | undefined;
} = {
  enum: (facet, raw) =>
    facet.options.some((o) => o.value === raw) ? raw : undefined,
  number: (facet, raw) => {
    const n = parseCount(raw);
    return n !== null && facet.options.includes(n) ? n : undefined;
  },
  boolean: (_facet, raw) => (TRUE_PARAMS.includes(raw) ? true : undefined),
};

function parseFacetValue(facet: Facet, raw: string): SpecValue | undefined {
  // TypeScript cannot correlate the looked-up parser with `facet`'s own variant across an
  // index access; the table above maps each type to the parser for exactly that variant.
  const parse = facetParsers[facet.type] as (
    f: Facet,
    r: string,
  ) => SpecValue | undefined;
  return parse(facet, raw);
}

function parseFacets(
  category: Category | null,
  params: SearchParamsRecord,
): Record<string, readonly SpecValue[]> {
  const entries = (category?.facets ?? [])
    .map((facet): [string, SpecValue[]] => [
      facet.key,
      unique(
        listParam(params, facet.key)
          .map((raw) => parseFacetValue(facet, raw))
          .filter((v): v is SpecValue => v !== undefined),
      ),
    ])
    .filter(([, values]) => values.length);
  return Object.fromEntries(entries);
}

/** Reads filters from URL params; invalid or unknown input is dropped, never thrown. */
export function parseFilters(
  category: Category | null,
  params: SearchParamsRecord,
): Filters {
  const min = parseCount(firstParam(params, "priceMin"));
  const max = parseCount(firstParam(params, "priceMax"));
  const inverted = min !== null && max !== null && min > max;
  const q = (firstParam(params, "q") ?? "").trim();
  const sort = firstParam(params, "sort");
  return {
    facets: parseFacets(category, params),
    brands: listParam(params, "brand"),
    conditions: listParam(params, "condition").filter(isCondition),
    priceMin: inverted ? max : min,
    priceMax: inverted ? min : max,
    sort: isSortKey(sort) ? sort : defaultSort(q),
    q,
  };
}

const serializeValue = (value: SpecValue): string =>
  value === true ? BOOLEAN_PARAM : String(value);

/** Stable key order (facets in config order, then common filters) and no defaults, so equal filters give equal URLs. */
export function filtersToSearchParams(
  filters: Filters,
  category: Category | null,
): URLSearchParams {
  const facetEntries = (category?.facets ?? [])
    .map((facet): [string, string] => [
      facet.key,
      (filters.facets[facet.key] ?? [])
        .map(serializeValue)
        .join(LIST_SEPARATOR),
    ])
    .filter(([, value]) => value);
  const commonEntries: [string, string][] = [
    ["brand", filters.brands.join(LIST_SEPARATOR)],
    ["condition", filters.conditions.join(LIST_SEPARATOR)],
    ["priceMin", filters.priceMin === null ? "" : String(filters.priceMin)],
    ["priceMax", filters.priceMax === null ? "" : String(filters.priceMax)],
    ["sort", filters.sort === defaultSort(filters.q) ? "" : filters.sort],
    ["q", filters.q],
  ];
  return new URLSearchParams([
    ...facetEntries,
    ...commonEntries.filter(([, value]) => value),
  ]);
}

export function summarizeOffers(offers: readonly Offer[]): OfferSummaries {
  const summarize = (condition: Condition): OfferSummary | null => {
    const prices = offers
      .filter((o) => o.condition === condition)
      .map((o) => o.priceUzs);
    return prices.length
      ? { count: prices.length, minPriceUzs: Math.min(...prices) }
      : null;
  };
  return { new: summarize("new"), used: summarize("used") };
}

interface Candidate {
  readonly product: Product;
  readonly matching: readonly Offer[];
  readonly minPriceUzs: number;
}

const comparators: Readonly<
  Record<SortKey, ((a: Candidate, b: Candidate) => number) | null>
> = {
  relevance: null,
  "price-asc": (a, b) => a.minPriceUzs - b.minPriceUzs,
  "price-desc": (a, b) => b.minPriceUzs - a.minPriceUzs,
};

/** The part of an offer that condition and price filters look at. */
export interface PricedOffer {
  readonly condition: Condition;
  readonly priceUzs: number;
}

/** Shared by listings and the search dialog, so both agree on which offers a filter keeps (spec §12.8). */
export function offerInRange(
  offer: PricedOffer,
  conditions: readonly Condition[],
  priceMin: number | null,
  priceMax: number | null,
): boolean {
  return (
    (!conditions.length || conditions.includes(offer.condition)) &&
    (priceMin === null || offer.priceUzs >= priceMin) &&
    (priceMax === null || offer.priceUzs <= priceMax)
  );
}

/**
 * Facets and brand select products; condition and price select offers (spec §12.8).
 * A product is listed only with at least one matching offer, and its summaries count only those.
 */
export function applyFilters(
  products: readonly Product[],
  offers: readonly Offer[],
  filters: Filters,
): ProductListing[] {
  const offersByProduct = Map.groupBy(offers, (o) => o.productId);

  const productMatches = (p: Product): boolean =>
    Object.entries(filters.facets).every(([key, values]) => {
      const spec = p.specs[key];
      return spec !== undefined && values.includes(spec);
    }) &&
    (!filters.brands.length || filters.brands.includes(p.brand));

  const offerMatches = (o: Offer): boolean =>
    offerInRange(o, filters.conditions, filters.priceMin, filters.priceMax);

  const candidates: Candidate[] = products
    .filter(productMatches)
    .map((product) => {
      const matching = (offersByProduct.get(product.id) ?? []).filter(
        offerMatches,
      );
      return {
        product,
        matching,
        minPriceUzs: Math.min(...matching.map((o) => o.priceUzs)),
      };
    })
    .filter((c) => c.matching.length);

  const compare = comparators[filters.sort];
  const ordered = compare ? candidates.toSorted(compare) : candidates;
  return ordered.map((c) => ({
    product: c.product,
    ...summarizeOffers(c.matching),
  }));
}
