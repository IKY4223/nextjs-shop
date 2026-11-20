import type { Condition } from "@/lib/catalog/types";
import { normalize } from "./normalize";

/** Longest phrase (in words) any synonym list may contain. */
export const MAX_PHRASE_WORDS = 3;

const SPACE = " ";

/**
 * Canonical term → variants people type (slang, Cyrillic spelling, typos), written naturally.
 * Applied to the index and to every query, so "джифорс" and "geforce" meet in the middle.
 */
const termSynonyms: Readonly<Record<string, readonly string[]>> = {
  geforce: ["джифорс", "жифорс", "geforse", "джефорс"],
  radeon: ["радеон", "redeon", "радион"],
  ryzen: ["райзен", "rayzen", "ризен"],
  intel: ["интел"],
  nvidia: ["нвидиа", "nvidea", "нвидия"],
  gskill: ["g.skill", "g skill", "джискилл", "джи скилл"],
  x3d: ["х3д"],
  rtx: ["ртх"],
  asus: ["асус"],
};

/** Condition words, written naturally; normalized once below. */
export const conditionSynonyms: Readonly<Record<Condition, readonly string[]>> =
  {
    new: ["новый", "новая", "новое", "новые", "yangi", "new"],
    used: ["б/у", "бу", "б у", "бывший в употреблении", "ishlatilgan", "used"],
  };

/** Normalized phrase → value, for phrases of 1–3 words. */
export function phraseTable<TValue>(
  entries: readonly (readonly [phrase: string, value: TValue])[],
): ReadonlyMap<string, TValue> {
  return new Map(
    entries
      .map(([phrase, value]): [string, TValue] => [normalize(phrase), value])
      .filter(([phrase]) => phrase),
  );
}

const termTable = phraseTable(
  Object.entries(termSynonyms).flatMap(([canonical, variants]) =>
    variants.map((variant): [string, string] => [variant, canonical]),
  ),
);

/** Longest-first match of a phrase from `table` at the start of `tokens`. */
export function matchPhraseAt<TValue>(
  tokens: readonly string[],
  table: ReadonlyMap<string, TValue>,
): { readonly words: number; readonly value: TValue } | null {
  const lengths = [MAX_PHRASE_WORDS, MAX_PHRASE_WORDS - 1, 1].filter(
    (n) => n <= tokens.length,
  );
  return (
    lengths
      .map((words) => ({
        words,
        value: table.get(tokens.slice(0, words).join(SPACE)),
      }))
      .find(
        (hit): hit is { words: number; value: TValue } =>
          hit.value !== undefined,
      ) ?? null
  );
}

function replaceTerms(tokens: readonly string[]): readonly string[] {
  const [first, ...rest] = tokens;
  if (first === undefined) return [];
  const hit = matchPhraseAt(tokens, termTable);
  return hit
    ? [hit.value, ...replaceTerms(tokens.slice(hit.words))]
    : [first, ...replaceTerms(rest)];
}

/** Replaces whole-word variants with their canonical term; input must already be normalized. */
export function applyTermSynonyms(normalized: string): string {
  return replaceTerms(normalized.split(SPACE).filter(Boolean)).join(SPACE);
}
