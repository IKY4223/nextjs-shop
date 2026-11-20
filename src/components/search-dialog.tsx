"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Category, Condition } from "@/lib/catalog/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import {
  moveSelection,
  withoutParts,
  type QueryPart,
} from "@/lib/search/dialog-state";
import { parseQuery } from "@/lib/search/parse-query";
import {
  buildSearchUrl,
  searchProducts,
  type SearchDoc,
} from "@/lib/search/search";
import { SearchIcon } from "./icons";

interface Chip {
  readonly part: QueryPart;
  readonly label: string;
}

const RESULT_LIMIT = 8;
const OPEN_KEY = "k";
const PRICE_PLACEHOLDER = "{price}";
const TRIGGER_SELECTOR = "[data-search-trigger]";
const RESULTS_ID = "search-results";
const hitId = (i: number): string => `search-hit-${i}`;

/**
 * Ctrl+K / ⌘K or any [data-search-trigger] opens it. Native modal <dialog>: Esc closes and the
 * rest of the page is inert, so Tab stays inside. Search runs in the browser over the prebuilt index.
 */
export function SearchDialog({
  lang,
  index,
  categories,
  dict,
}: {
  readonly lang: Locale;
  readonly index: readonly SearchDoc[];
  readonly categories: readonly Category[];
  readonly dict: Pick<Dictionary, "search" | "catalog">;
}): React.JSX.Element {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [removed, setRemoved] = useState<ReadonlySet<QueryPart>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);

  const parsed = useMemo(
    () => withoutParts(parseQuery(query, categories), removed),
    [query, categories, removed],
  );
  const hits = useMemo(
    () => searchProducts(index, parsed, RESULT_LIMIT),
    [index, parsed],
  );

  useEffect(() => {
    const open = (): void => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
      inputRef.current?.focus();
    };
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === OPEN_KEY
      ) {
        event.preventDefault();
        open();
      }
    };
    const onClick = (event: MouseEvent): void => {
      if (
        event.target instanceof Element &&
        event.target.closest(TRIGGER_SELECTOR)
      )
        open();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const go = (href: string): void => {
    dialogRef.current?.close();
    router.push(href);
  };

  const keyActions: Readonly<Record<string, () => void>> = {
    ArrowDown: () => setSelected(moveSelection(selected, 1, hits.length)),
    ArrowUp: () => setSelected(moveSelection(selected, -1, hits.length)),
    Enter: () => {
      const hit = selected === null ? undefined : hits[selected];
      go(hit ? `/${lang}/p/${hit.slug}` : buildSearchUrl(lang, parsed, hits));
    },
  };
  const onInputKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    const action = keyActions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const conditionLabel: Readonly<Record<Condition, string>> = {
    new: dict.catalog.conditionNew,
    used: dict.catalog.conditionUsed,
  };
  const price = (template: string, amount: number): string =>
    template.replace(PRICE_PLACEHOLDER, formatPrice(amount, lang));
  const categoryName = (slug: string): string =>
    categories.find((c) => c.slug === slug)?.name[lang] ?? slug;

  const chips: Chip[] = [
    ...(parsed.categorySlug
      ? [
          {
            part: "category" as const,
            label: categoryName(parsed.categorySlug),
          },
        ]
      : []),
    ...(parsed.condition
      ? [
          {
            part: "condition" as const,
            label: conditionLabel[parsed.condition],
          },
        ]
      : []),
    ...(parsed.priceMin === null
      ? []
      : [
          {
            part: "priceMin" as const,
            label: price(dict.search.priceMin, parsed.priceMin),
          },
        ]),
    ...(parsed.priceMax === null
      ? []
      : [
          {
            part: "priceMax" as const,
            label: price(dict.search.priceMax, parsed.priceMax),
          },
        ]),
  ];

  return (
    <dialog
      ref={dialogRef}
      aria-label={dict.search.title}
      onClose={() => setSelected(null)}
      className="mx-auto mt-[10vh] w-[min(40rem,calc(100%-2rem))] rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex items-center gap-2 border-b border-border px-4">
        <SearchIcon className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          autoFocus
          type="search"
          role="combobox"
          aria-label={dict.search.title}
          aria-expanded={hits.length > 0}
          aria-controls={RESULTS_ID}
          aria-autocomplete="list"
          aria-activedescendant={
            selected === null ? undefined : hitId(selected)
          }
          value={query}
          placeholder={dict.search.placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setRemoved(new Set());
            setSelected(null);
          }}
          onKeyDown={onInputKey}
          className="h-12 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-4 pt-3">
          {chips.map((chip) => (
            <li key={chip.part}>
              <button
                type="button"
                onClick={() => setRemoved(new Set([...removed, chip.part]))}
                aria-label={`${dict.search.remove}: ${chip.label}`}
                className="rounded-full bg-chip px-2.5 py-0.5 text-xs hover:text-accent"
              >
                {chip.label} <span aria-hidden>✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ul
        id={RESULTS_ID}
        role="listbox"
        className="max-h-[60vh] overflow-y-auto p-2"
      >
        {hits.map((hit, i) => (
          <li
            key={hit.slug}
            id={hitId(i)}
            role="option"
            aria-selected={i === selected}
          >
            <Link
              href={`/${lang}/p/${hit.slug}`}
              onClick={() => dialogRef.current?.close()}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                i === selected ? "bg-chip" : "hover:bg-chip"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {hit.displayName}
                </span>
                <span className="text-xs text-muted">
                  {categoryName(hit.categorySlug)}
                </span>
              </span>
              {hit.minPriceUzs !== null && (
                <span className="text-sm whitespace-nowrap text-accent">
                  {price(dict.catalog.offersFrom, hit.minPriceUzs)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {query.trim() && !hits.length && (
        <p className="px-4 pb-4 text-sm text-muted">{dict.search.noResults}</p>
      )}
      <p className="border-t border-border px-4 py-2 text-xs text-muted">
        {dict.search.hint}
      </p>
    </dialog>
  );
}
