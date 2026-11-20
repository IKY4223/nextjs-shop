"use client";

import { useRouter } from "next/navigation";
import { useRef, type KeyboardEvent } from "react";
import {
  activeFilterCount,
  filtersHref,
  withBrandToggled,
  withConditionToggled,
  withFacetToggled,
  withPriceRange,
} from "@/lib/catalog/filter-updates";
import type { Filters } from "@/lib/catalog/filters";
import { formatSpecValue } from "@/lib/catalog/format";
import type {
  Category,
  Condition,
  Facet,
  SpecValue,
} from "@/lib/catalog/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";

interface Option {
  readonly value: SpecValue;
  readonly label: string;
}

const ENTER_KEY = "Enter";
const CONDITIONS: readonly Condition[] = ["new", "used"];

function facetOptions(facet: Facet, lang: Locale): Option[] {
  if (facet.type === "enum")
    return facet.options.map((o) => ({
      value: o.value,
      label: formatSpecValue(facet, o.value, lang),
    }));
  if (facet.type === "number")
    return facet.options.map((n) => ({
      value: n,
      label: formatSpecValue(facet, n, lang),
    }));
  return [{ value: true, label: facet.label[lang] }];
}

/** Whole, non-negative amount typed by the user; anything else clears that bound. */
function toPrice(raw: string): number | null {
  const n = Number(raw);
  return raw.trim() && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function CheckboxGroup({
  legend,
  idPrefix,
  options,
  selected,
  onToggle,
}: {
  readonly legend: string;
  readonly idPrefix: string;
  readonly options: readonly Option[];
  readonly selected: readonly SpecValue[];
  readonly onToggle: (value: SpecValue) => void;
}): React.JSX.Element {
  return (
    <fieldset className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <ul className="space-y-1.5">
        {options.map((option) => {
          const id = `${idPrefix}-${String(option.value)}`;
          return (
            <li key={id} className="flex items-center gap-2 text-sm">
              <input
                id={id}
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => onToggle(option.value)}
                className="size-4 accent-[var(--mg-accent)]"
              />
              <label htmlFor={id} className="cursor-pointer">
                {option.label}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

/**
 * One native <dialog>: on md+ it is shown inline as a sidebar by CSS; below md the
 * "Filters (n)" button opens it modally (Esc closes, focus stays inside). Every change replaces the URL.
 */
export function FilterPanel({
  lang,
  category,
  brands,
  filters,
  dict,
}: {
  readonly lang: Locale;
  readonly category: Category;
  readonly brands: readonly string[];
  readonly filters: Filters;
  readonly dict: Dictionary["catalog"];
}): React.JSX.Element {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const basePath = `/${lang}/c/${category.slug}`;
  const count = activeFilterCount(filters);

  const apply = (next: Filters): void => {
    router.replace(filtersHref(basePath, next, category), { scroll: false });
  };
  const commitPrice = (): void => {
    apply(
      withPriceRange(
        filters,
        toPrice(minRef.current?.value ?? ""),
        toPrice(maxRef.current?.value ?? ""),
      ),
    );
  };
  const onPriceKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === ENTER_KEY) commitPrice();
  };
  const conditionLabels: Readonly<Record<Condition, string>> = {
    new: dict.conditionNew,
    used: dict.conditionUsed,
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium md:hidden"
      >
        {dict.filters}
        {count ? ` (${count})` : ""}
      </button>
      <dialog
        ref={dialogRef}
        aria-label={dict.filters}
        className="m-0 h-full max-h-none w-[min(22rem,100%)] max-w-none bg-surface p-5 text-text backdrop:bg-black/60 md:static md:block md:h-auto md:w-auto md:bg-transparent md:p-0"
      >
        <div className="mb-4 flex items-center justify-between md:hidden">
          <h2 className="text-lg font-semibold">{dict.filters}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-chip"
          >
            {dict.close}
          </button>
        </div>

        {category.facets.map((facet) => (
          <CheckboxGroup
            key={facet.key}
            legend={facet.label[lang]}
            idPrefix={`f-${facet.key}`}
            options={facetOptions(facet, lang)}
            selected={filters.facets[facet.key] ?? []}
            onToggle={(value) =>
              apply(withFacetToggled(filters, facet.key, value))
            }
          />
        ))}

        <CheckboxGroup
          legend={dict.brand}
          idPrefix="f-brand"
          options={brands.map((b) => ({ value: b, label: b }))}
          selected={filters.brands}
          onToggle={(value) => apply(withBrandToggled(filters, String(value)))}
        />

        <CheckboxGroup
          legend={dict.condition}
          idPrefix="f-condition"
          options={CONDITIONS.map((c) => ({
            value: c,
            label: conditionLabels[c],
          }))}
          selected={filters.conditions}
          onToggle={(value) =>
            CONDITIONS.filter((c) => c === value).forEach((c) =>
              apply(withConditionToggled(filters, c)),
            )
          }
        />

        <fieldset className="border-t border-border py-4">
          <legend className="mb-2 text-sm font-semibold">{dict.price}</legend>
          <div className="flex items-center gap-2">
            <input
              ref={minRef}
              key={`min-${filters.priceMin ?? ""}`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={dict.priceFrom}
              aria-label={`${dict.price} — ${dict.priceFrom}`}
              defaultValue={filters.priceMin ?? ""}
              onBlur={commitPrice}
              onKeyDown={onPriceKey}
              className="w-full min-w-0 rounded-lg border border-border bg-bg px-2 py-1 text-sm"
            />
            <span aria-hidden className="text-muted">
              –
            </span>
            <input
              ref={maxRef}
              key={`max-${filters.priceMax ?? ""}`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={dict.priceTo}
              aria-label={`${dict.price} — ${dict.priceTo}`}
              defaultValue={filters.priceMax ?? ""}
              onBlur={commitPrice}
              onKeyDown={onPriceKey}
              className="w-full min-w-0 rounded-lg border border-border bg-bg px-2 py-1 text-sm"
            />
          </div>
        </fieldset>

        {count > 0 && (
          <button
            type="button"
            onClick={() =>
              apply({
                ...filters,
                facets: {},
                brands: [],
                conditions: [],
                priceMin: null,
                priceMax: null,
              })
            }
            className="mt-2 text-sm text-accent hover:underline"
          >
            {dict.reset}
          </button>
        )}
      </dialog>
    </div>
  );
}
