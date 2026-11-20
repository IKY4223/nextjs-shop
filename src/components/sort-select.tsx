"use client";

import { useRouter } from "next/navigation";
import { filtersHref, withSort } from "@/lib/catalog/filter-updates";
import { SORT_KEYS, type Filters, type SortKey } from "@/lib/catalog/filters";
import type { Category } from "@/lib/catalog/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const isSortKey = (value: string): value is SortKey =>
  (SORT_KEYS as readonly string[]).includes(value);

export function SortSelect({
  basePath,
  category,
  filters,
  dict,
}: {
  readonly basePath: string;
  readonly category: Category | null;
  readonly filters: Filters;
  readonly dict: Dictionary["catalog"];
}): React.JSX.Element {
  const router = useRouter();
  const labels: Readonly<Record<SortKey, string>> = {
    relevance: dict.sortRelevance,
    "price-asc": dict.sortPriceAsc,
    "price-desc": dict.sortPriceDesc,
  };
  // relevance only means something when there is search text
  const options = SORT_KEYS.filter((key) => key !== "relevance" || filters.q);

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      {dict.sort}
      <select
        value={filters.sort}
        onChange={(event) => {
          const value = event.target.value;
          if (isSortKey(value))
            router.replace(
              filtersHref(basePath, withSort(filters, value), category),
              {
                scroll: false,
              },
            );
        }}
        className="rounded-lg border border-muted bg-surface px-2 py-1 text-text"
      >
        {options.map((key) => (
          <option key={key} value={key}>
            {labels[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
