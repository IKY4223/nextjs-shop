"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type KeyboardEvent } from "react";
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

interface ControlsProps {
  readonly lang: Locale;
  readonly category: Category;
  readonly brands: readonly string[];
  readonly filters: Filters;
  readonly dict: Dictionary["catalog"];
  /** Keeps checkbox ids unique: the sidebar and the mobile sheet render the same controls. */
  readonly scope: string;
  readonly layout: Layout;
  readonly apply: (next: Filters) => void;
}

/** "list" for the narrow desktop sidebar; "grid" of big toggle chips for touch in the phone sheet. */
type Layout = "list" | "grid";

const LAYOUT_STYLES: Readonly<
  Record<
    Layout,
    {
      readonly list: string;
      readonly label: string;
      readonly input: string;
      readonly price: string;
    }
  >
> = {
  list: {
    list: "space-y-0.5",
    label: "flex min-h-7 cursor-pointer items-center gap-2 text-sm",
    input: "size-4 accent-[var(--mg-accent)]",
    price: "px-2 py-1 text-sm",
  },
  grid: {
    list: "grid grid-cols-2 gap-2 min-[26rem]:grid-cols-3",
    // the real checkbox stays (keyboard, screen readers); the chip shows its state
    label:
      "flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-muted px-2 py-1 text-center text-sm transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-on-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
    input: "sr-only",
    price: "h-11 px-3 text-base",
  },
};

const ENTER_KEY = "Enter";
const COUNT_PLACEHOLDER = "{count}";
const CONDITIONS: readonly Condition[] = ["new", "used"];
/** Tailwind's md breakpoint: from here the sidebar is shown and the mobile sheet must not stay open. */
const DESKTOP_QUERY = "(min-width: 48rem)";

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
  layout,
  options,
  selected,
  onToggle,
}: {
  readonly legend: string;
  readonly idPrefix: string;
  readonly layout: Layout;
  readonly options: readonly Option[];
  readonly selected: readonly SpecValue[];
  readonly onToggle: (value: SpecValue) => void;
}): React.JSX.Element {
  const styles = LAYOUT_STYLES[layout];
  return (
    <fieldset className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <ul className={styles.list}>
        {options.map((option) => {
          const id = `${idPrefix}-${String(option.value)}`;
          return (
            <li key={id}>
              {/* the whole row/chip is the click target: ≥ 24px (list), 44px (grid) */}
              <label htmlFor={id} className={styles.label}>
                <input
                  id={id}
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => onToggle(option.value)}
                  className={styles.input}
                />
                {option.label}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

/** Every filter control, built from the category config only (no slug checks). */
function FilterControls({
  lang,
  category,
  brands,
  filters,
  dict,
  scope,
  layout,
  apply,
}: ControlsProps): React.JSX.Element {
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const count = activeFilterCount(filters);
  const conditionLabels: Readonly<Record<Condition, string>> = {
    new: dict.conditionNew,
    used: dict.conditionUsed,
  };

  const commitPrice = (): void => {
    const next = withPriceRange(
      filters,
      toPrice(minRef.current?.value ?? ""),
      toPrice(maxRef.current?.value ?? ""),
    );
    // tabbing through the inputs must not trigger a navigation when nothing changed
    if (
      next.priceMin === filters.priceMin &&
      next.priceMax === filters.priceMax
    )
      return;
    apply(next);
  };
  const onPriceKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === ENTER_KEY) commitPrice();
  };

  return (
    <>
      {category.facets.map((facet) => (
        <CheckboxGroup
          key={facet.key}
          legend={facet.label[lang]}
          idPrefix={`${scope}-${facet.key}`}
          layout={layout}
          options={facetOptions(facet, lang)}
          selected={filters.facets[facet.key] ?? []}
          onToggle={(value) =>
            apply(withFacetToggled(filters, facet.key, value))
          }
        />
      ))}

      <CheckboxGroup
        legend={dict.brand}
        idPrefix={`${scope}-brand`}
        layout={layout}
        options={brands.map((b) => ({ value: b, label: b }))}
        selected={filters.brands}
        onToggle={(value) => apply(withBrandToggled(filters, String(value)))}
      />

      <CheckboxGroup
        legend={dict.condition}
        idPrefix={`${scope}-condition`}
        layout={layout}
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
            className={`w-full min-w-0 rounded-lg border border-muted bg-bg ${LAYOUT_STYLES[layout].price}`}
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
            className={`w-full min-w-0 rounded-lg border border-muted bg-bg ${LAYOUT_STYLES[layout].price}`}
          />
        </div>
      </fieldset>

      {(count > 0 || Boolean(filters.q)) && (
        <button
          type="button"
          // reset clears the search text too: it narrows the grid just like a filter
          onClick={() =>
            apply({
              ...filters,
              facets: {},
              brands: [],
              conditions: [],
              priceMin: null,
              priceMax: null,
              q: "",
              sort: filters.sort === "relevance" ? "price-asc" : filters.sort,
            })
          }
          className="mt-2 text-sm text-accent hover:underline"
        >
          {dict.reset}
        </button>
      )}
    </>
  );
}

/**
 * md+: a plain sidebar. Below md: a "Filters (n)" button opens a full-screen sheet (native modal
 * <dialog>: Esc closes, focus stays inside) with a sticky "show results" button. Growing the window
 * past md closes the sheet, so it never lingers as a dark overlay over the desktop layout.
 * Every change replaces the URL.
 */
export function FilterPanel({
  lang,
  category,
  brands,
  filters,
  dict,
  resultCount,
}: Omit<ControlsProps, "scope" | "layout" | "apply"> & {
  readonly resultCount: number;
}): React.JSX.Element {
  const router = useRouter();
  const sheetRef = useRef<HTMLDialogElement>(null);
  const basePath = `/${lang}/c/${category.slug}`;
  const count = activeFilterCount(filters);

  const apply = (next: Filters): void => {
    router.replace(filtersHref(basePath, next, category), { scroll: false });
  };
  const close = (): void => sheetRef.current?.close();

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onChange = (): void => {
      if (desktop.matches) sheetRef.current?.close();
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  const controls = { lang, category, brands, filters, dict, apply } as const;

  return (
    <div>
      <aside aria-label={dict.filters} className="hidden md:block">
        <FilterControls {...controls} scope="side" layout="list" />
      </aside>

      <button
        type="button"
        onClick={() => sheetRef.current?.showModal()}
        className="w-full rounded-lg border border-muted bg-surface px-3 py-2 text-sm font-medium md:hidden"
      >
        {dict.filters}
        {count ? ` (${count})` : ""}
      </button>

      <dialog
        ref={sheetRef}
        aria-label={dict.filters}
        className="filter-sheet fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-bg p-0 text-text backdrop:bg-transparent"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">{dict.filters}</h2>
            <button
              type="button"
              onClick={close}
              aria-label={dict.close}
              className="rounded-lg p-2 text-muted hover:bg-chip hover:text-text"
            >
              <span aria-hidden>✕</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <FilterControls {...controls} scope="sheet" layout="grid" />
          </div>
          <div className="border-t border-border p-4">
            <button
              type="button"
              onClick={close}
              className="w-full rounded-lg bg-accent py-3 font-medium text-on-accent"
            >
              {dict.showResults.replace(COUNT_PLACEHOLDER, String(resultCount))}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
