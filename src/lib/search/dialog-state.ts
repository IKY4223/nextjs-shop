import type { ParsedQuery } from "./parse-query";

/** Recognised parts of a query the user can dismiss as chips in the search dialog. */
export type QueryPart = "category" | "condition" | "priceMin" | "priceMax";

const clearPart: Readonly<
  Record<QueryPart, (parsed: ParsedQuery) => ParsedQuery>
> = {
  category: (p) => ({ ...p, categorySlug: null }),
  condition: (p) => ({ ...p, condition: null }),
  priceMin: (p) => ({ ...p, priceMin: null }),
  priceMax: (p) => ({ ...p, priceMax: null }),
};

/** The query as the user means it after dismissing some chips; the text part always stays. */
export function withoutParts(
  parsed: ParsedQuery,
  removed: ReadonlySet<QueryPart>,
): ParsedQuery {
  return [...removed].reduce((acc, part) => clearPart[part](acc), parsed);
}

/** Arrow-key selection over `count` results, wrapping at both ends; null when there is nothing to select. */
export function moveSelection(
  current: number | null,
  delta: 1 | -1,
  count: number,
): number | null {
  if (!count) return null;
  if (current === null) return delta > 0 ? 0 : count - 1;
  return (current + delta + count) % count;
}

/** What the user dismissed: each part with the value it had at that moment. */
export type Dismissals = ReadonlyMap<QueryPart, string | number>;

const partValue: Readonly<
  Record<QueryPart, (parsed: ParsedQuery) => string | number | null>
> = {
  category: (p) => p.categorySlug,
  condition: (p) => p.condition,
  priceMin: (p) => p.priceMin,
  priceMax: (p) => p.priceMax,
};

/** Records a dismissed chip together with its current value. */
export function dismiss(
  dismissals: Dismissals,
  parsed: ParsedQuery,
  part: QueryPart,
): Dismissals {
  const value = partValue[part](parsed);
  return value === null ? dismissals : new Map(dismissals).set(part, value);
}

/** Parts that stay dismissed after a keystroke: only those whose parsed value did not change. */
export function keptDismissals(
  dismissals: Dismissals,
  parsed: ParsedQuery,
): ReadonlySet<QueryPart> {
  return new Set(
    [...dismissals]
      .filter(([part, value]) => partValue[part](parsed) === value)
      .map(([part]) => part),
  );
}
