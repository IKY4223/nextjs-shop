/** Pure "what the filters become after this click" helpers for the filter panel; inputs are never mutated. */
import { filtersToSearchParams, type Filters, type SortKey } from "./filters";
import type { Category, Condition, SpecValue } from "./types";

/** `basePath` plus the filters' canonical query string (none when every filter is default). */
export function filtersHref(
  basePath: string,
  filters: Filters,
  category: Category | null,
): string {
  const query = filtersToSearchParams(filters, category).toString();
  return query ? `${basePath}?${query}` : basePath;
}

function toggled<TValue>(values: readonly TValue[], value: TValue): TValue[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

export function withFacetToggled(
  filters: Filters,
  key: string,
  value: SpecValue,
): Filters {
  const next = toggled(filters.facets[key] ?? [], value);
  const others = Object.fromEntries(
    Object.entries(filters.facets).filter(([k]) => k !== key),
  );
  return {
    ...filters,
    facets: next.length ? { ...others, [key]: next } : others,
  };
}

export type RemovablePart = "condition" | "priceMin" | "priceMax" | "q";

const clearCommon: Readonly<Record<RemovablePart, (f: Filters) => Filters>> = {
  condition: (f) => ({ ...f, conditions: [] }),
  priceMin: (f) => ({ ...f, priceMin: null }),
  priceMax: (f) => ({ ...f, priceMax: null }),
  q: (f) => ({ ...f, q: "" }),
};

const isActive: Readonly<Record<RemovablePart, (f: Filters) => boolean>> = {
  condition: (f) => Boolean(f.conditions.length),
  priceMin: (f) => f.priceMin !== null,
  priceMax: (f) => f.priceMax !== null,
  q: (f) => Boolean(f.q),
};

/**
 * Chips for the search and category pages: each active common filter with a link to the same
 * page without it. Pass the category on a category page so its facet params survive the removal.
 */
export function removableFilterLinks(
  basePath: string,
  filters: Filters,
  category: Category | null = null,
): { readonly part: RemovablePart; readonly href: string }[] {
  const parts: readonly RemovablePart[] = [
    "condition",
    "priceMin",
    "priceMax",
    "q",
  ];
  return parts
    .filter((part) => isActive[part](filters))
    .map((part) => ({
      part,
      // without q, "relevance" means nothing: fall back to the default price order
      href: filtersHref(
        basePath,
        {
          ...clearCommon[part](filters),
          sort:
            part === "q" && filters.sort === "relevance"
              ? "price-asc"
              : filters.sort,
        },
        category,
      ),
    }));
}

export function withBrandToggled(filters: Filters, brand: string): Filters {
  return { ...filters, brands: toggled(filters.brands, brand) };
}

export function withConditionToggled(
  filters: Filters,
  condition: Condition,
): Filters {
  return { ...filters, conditions: toggled(filters.conditions, condition) };
}

export function withPriceRange(
  filters: Filters,
  min: number | null,
  max: number | null,
): Filters {
  const inverted = min !== null && max !== null && min > max;
  return {
    ...filters,
    priceMin: inverted ? max : min,
    priceMax: inverted ? min : max,
  };
}

export function withSort(filters: Filters, sort: SortKey): Filters {
  return { ...filters, sort };
}

/** Number shown on the mobile "Filters (n)" button: every selected value and price bound. */
export function activeFilterCount(filters: Filters): number {
  const facetValues = Object.values(filters.facets).reduce(
    (sum, values) => sum + values.length,
    0,
  );
  const priceBounds = [filters.priceMin, filters.priceMax].filter(
    (bound) => bound !== null,
  ).length;
  return (
    facetValues +
    filters.brands.length +
    filters.conditions.length +
    priceBounds
  );
}
