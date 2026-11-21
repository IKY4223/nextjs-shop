import type { Category, Condition } from "@/lib/catalog/types";
import { normalize } from "./normalize";
import {
  applyTermSynonyms,
  conditionSynonyms,
  matchPhraseAt,
  phraseTable,
} from "./synonyms";

export interface ParsedQuery {
  /** Normalized words left after removing recognised price, condition and category phrases. */
  readonly text: string;
  readonly categorySlug: string | null;
  readonly condition: Condition | null;
  readonly priceMin: number | null;
  readonly priceMax: number | null;
}

type PriceRole = "min" | "max";

interface Amount {
  /** Token indexes this amount occupies, keywords included. */
  readonly indexes: readonly number[];
  readonly number: number;
  readonly multiplier: number | null;
  readonly prefix: PriceRole | null;
  readonly postfix: PriceRole | null;
}

interface PriceResult {
  readonly priceMin: number | null;
  readonly priceMax: number | null;
  readonly consumed: ReadonlySet<number>;
}

interface Extraction<TValue> {
  readonly values: readonly TValue[];
  readonly rest: readonly string[];
}

const BILLION = 1_000_000_000;
const MILLION = 1_000_000;
const THOUSAND = 1_000;
const NO_MULTIPLIER = 1;
const TOKENS_NUMBER_ONLY = 1;
const TOKENS_NUMBER_AND_UNIT = 2;
const MIN_MARKED_PRICE = 1_000;
/** Bare numbers below this are model numbers or specs ("9800", "6000", "5070"), not prices. */
const MIN_BARE_PRICE = 100_000;
const MIN_FUZZY_WORD_LENGTH = 6;
const MAX_TYPO_DISTANCE = 1;
const SPACE = " ";
const DECIMAL_POINT = ".";

const UNITS = phraseTable<number>([
  ["млрд", BILLION],
  ["mlrd", BILLION],
  ["milliard", BILLION],
  ["миллиард", BILLION],
  ["миллиарда", BILLION],
  ["миллиардов", BILLION],
  ["млн", MILLION],
  ["mln", MILLION],
  ["million", MILLION],
  ["millions", MILLION],
  ["миллион", MILLION],
  ["миллиона", MILLION],
  ["миллионов", MILLION],
  ["тыс", THOUSAND],
  ["тысяча", THOUSAND],
  ["тысячи", THOUSAND],
  ["тысяч", THOUSAND],
  ["ming", THOUSAND],
  ["k", THOUSAND],
]);
/** Currency words carry no search meaning ("до 5 млн сум"): they are dropped before parsing. */
const CURRENCY_WORDS: readonly string[] = [
  ...new Set(
    ["сум", "сума", "сумов", "sum", "so'm", "сўм", "soum", "uzs"].map(
      normalize,
    ),
  ),
];
/** Digits per thousands group in "4 500 000". */
const GROUP_DIGITS = 3;
/** Russian keywords stand before the amount ("до 5 млн"). */
const PREFIX_KEYWORDS = phraseTable<PriceRole>([
  ["до", "max"],
  ["дешевле", "max"],
  ["от", "min"],
  ["дороже", "min"],
]);
/** Uzbek keywords follow the amount, separate or glued to the unit ("3 mln gacha", "1 mlndan"). */
const POSTFIX_KEYWORDS = phraseTable<PriceRole>([
  ["gacha", "max"],
  ["dan", "min"],
]);
const CONDITIONS = phraseTable<Condition>(
  Object.entries(conditionSynonyms).flatMap(([condition, words]) =>
    words.map((w): [string, Condition] => [w, condition as Condition]),
  ),
);

const isDigit = (ch: string): boolean => ch >= "0" && ch <= "9";

function parseNumberToken(token: string): number | null {
  const chars = [...token];
  const wellFormed =
    isDigit(chars[0] ?? "") &&
    chars.every((ch) => isDigit(ch) || ch === DECIMAL_POINT);
  const n = Number(token);
  return wellFormed && Number.isFinite(n) ? n : null;
}

const isDigitsOnly = (token: string): boolean =>
  token.length > 0 && [...token].every(isDigit);

/** "5000000som" → "5000000": a currency word glued to a number. */
function unglueCurrency(token: string): string {
  const suffix = CURRENCY_WORDS.find(
    (c) =>
      token.length > c.length &&
      token.endsWith(c) &&
      parseNumberToken(token.slice(0, -c.length)) !== null,
  );
  return suffix ? token.slice(0, -suffix.length) : token;
}

const isThousandsGroup = (token: string): boolean =>
  isDigitsOnly(token) && token.length === GROUP_DIGITS;

/** ["4", "500", "000"] → ["4500000"]: a 1–3 digit number followed by exact 3-digit groups. */
function mergeDigitGroups(tokens: readonly string[]): string[] {
  const [first, ...rest] = tokens;
  if (first === undefined) return [];
  const firstNonGroup = rest.findIndex((t) => !isThousandsGroup(t));
  const leadingGroups = firstNonGroup === -1 ? rest.length : firstNonGroup;
  const canLead = isDigitsOnly(first) && first.length <= GROUP_DIGITS;
  const groupCount = canLead ? leadingGroups : 0;
  if (!groupCount) return [first, ...mergeDigitGroups(rest)];
  return [
    [first, ...rest.slice(0, groupCount)].join(""),
    ...mergeDigitGroups(rest.slice(groupCount)),
  ];
}

/** Prepares tokens for price parsing: unglue and drop currency words, merge thousands groups. */
function priceReadyTokens(tokens: readonly string[]): string[] {
  return mergeDigitGroups(
    tokens.map(unglueCurrency).filter((t) => !CURRENCY_WORDS.includes(t)),
  );
}

/** "mln" → ×1e6; "mlngacha" → ×1e6 with a max suffix; anything else → null. */
function parseUnitToken(
  token: string | undefined,
): { readonly multiplier: number; readonly suffix: PriceRole | null } | null {
  if (token === undefined) return null;
  const exact = UNITS.get(token);
  if (exact !== undefined) return { multiplier: exact, suffix: null };
  const glued = [...POSTFIX_KEYWORDS].flatMap(([suffix, role]) => {
    const unit = token.endsWith(suffix)
      ? UNITS.get(token.slice(0, -suffix.length))
      : undefined;
    return unit === undefined ? [] : [{ multiplier: unit, suffix: role }];
  });
  return glued[0] ?? null;
}

function amountAt(tokens: readonly string[], i: number): Amount | null {
  const number = parseNumberToken(tokens[i] ?? "");
  if (number === null) return null;
  const unit = parseUnitToken(tokens[i + 1]);
  const afterAmount = i + (unit ? TOKENS_NUMBER_AND_UNIT : TOKENS_NUMBER_ONLY);
  const separatePostfix = unit?.suffix
    ? undefined
    : POSTFIX_KEYWORDS.get(tokens[afterAmount] ?? "");
  const prefix = PREFIX_KEYWORDS.get(tokens[i - 1] ?? "") ?? null;
  const indexes = [
    ...(prefix ? [i - 1] : []),
    i,
    ...(unit ? [i + 1] : []),
    ...(separatePostfix ? [afterAmount] : []),
  ];
  return {
    indexes,
    number,
    multiplier: unit?.multiplier ?? null,
    prefix,
    postfix: unit?.suffix ?? separatePostfix ?? null,
  };
}

const priceOf = (amount: Amount, multiplier: number | null): number =>
  Math.round(amount.number * (multiplier ?? NO_MULTIPLIER));

const isRange = (a: Amount, b: Amount | undefined): b is Amount =>
  b !== undefined &&
  ((a.prefix === "min" && b.prefix === "max") ||
    (a.postfix === "min" && b.postfix === "max"));

/** The role a lone amount plays, or null if it is not a price at all. */
function singleRole(amount: Amount): PriceRole | null {
  const price = priceOf(amount, amount.multiplier);
  const marked = amount.prefix ?? amount.postfix;
  if (marked) return price >= MIN_MARKED_PRICE ? marked : null;
  if (amount.multiplier !== null) return "max";
  return price >= MIN_BARE_PRICE ? "max" : null;
}

function parsePrices(tokens: readonly string[]): PriceResult {
  const amounts = tokens
    .map((_, i) => amountAt(tokens, i))
    .filter((a): a is Amount => a !== null);

  const rangeStart = amounts.findIndex((a, k) => isRange(a, amounts[k + 1]));
  const from = amounts[rangeStart];
  const to = amounts[rangeStart + 1];
  if (from && to) {
    const multiplier = to.multiplier;
    return {
      priceMin: priceOf(from, from.multiplier ?? multiplier),
      priceMax: priceOf(to, multiplier),
      consumed: new Set([...from.indexes, ...to.indexes]),
    };
  }

  const roles = amounts
    .map((amount) => ({ amount, role: singleRole(amount) }))
    .filter((r) => r.role !== null);
  const minAmount = roles.find((r) => r.role === "min")?.amount;
  const maxAmount = roles.find((r) => r.role === "max")?.amount;
  return {
    priceMin: minAmount ? priceOf(minAmount, minAmount.multiplier) : null,
    priceMax: maxAmount ? priceOf(maxAmount, maxAmount.multiplier) : null,
    consumed: new Set([
      ...(minAmount?.indexes ?? []),
      ...(maxAmount?.indexes ?? []),
    ]),
  };
}

/** Removes every phrase `match` recognises (longest first), collecting their values. */
function extract<TValue>(
  tokens: readonly string[],
  match: (
    tokens: readonly string[],
  ) => { readonly words: number; readonly value: TValue } | null,
): Extraction<TValue> {
  const [first, ...rest] = tokens;
  if (first === undefined) return { values: [], rest: [] };
  const hit = match(tokens);
  if (hit) {
    const next = extract(tokens.slice(hit.words), match);
    return { values: [hit.value, ...next.values], rest: next.rest };
  }
  const next = extract(rest, match);
  return { values: next.values, rest: [first, ...next.rest] };
}

function levenshtein(a: string, b: string): number {
  const firstRow = Array.from({ length: b.length + 1 }, (_, j) => j);
  const lastRow = [...a].reduce<number[]>(
    (prev, charA, i) =>
      [...b].reduce<number[]>(
        (row, charB, j) => [
          ...row,
          Math.min(
            (row[j] ?? 0) + 1,
            (prev[j + 1] ?? 0) + 1,
            (prev[j] ?? 0) + (charA === charB ? 0 : 1),
          ),
        ],
        [i + 1],
      ),
    firstRow,
  );
  return lastRow[b.length] ?? 0;
}

interface CategoryMatcher {
  readonly exact: ReadonlyMap<string, string>;
  readonly singleWords: readonly (readonly [word: string, slug: string])[];
}

const matcherCache = new WeakMap<readonly Category[], CategoryMatcher>();

function categoryMatcher(categories: readonly Category[]): CategoryMatcher {
  const cached = matcherCache.get(categories);
  if (cached) return cached;
  const exact = phraseTable(
    categories.flatMap((c) =>
      c.searchSynonyms.map((s): [string, string] => [s, c.slug]),
    ),
  );
  const matcher: CategoryMatcher = {
    exact,
    singleWords: [...exact].filter(([phrase]) => !phrase.includes(SPACE)),
  };
  matcherCache.set(categories, matcher);
  return matcher;
}

function matchCategory(
  tokens: readonly string[],
  matcher: CategoryMatcher,
): { readonly words: number; readonly value: string } | null {
  const exact = matchPhraseAt(tokens, matcher.exact);
  if (exact) return exact;
  const word = tokens[0] ?? "";
  if (word.length < MIN_FUZZY_WORD_LENGTH) return null;
  const typo = matcher.singleWords.find(
    ([candidate]) =>
      Math.abs(candidate.length - word.length) <= MAX_TYPO_DISTANCE &&
      levenshtein(word, candidate) <= MAX_TYPO_DISTANCE,
  );
  return typo ? { words: 1, value: typo[1] } : null;
}

/** Splits a raw search query into filters (price, condition, category) and the words left to search for. */
export function parseQuery(
  raw: string,
  categories: readonly Category[],
): ParsedQuery {
  const tokens = priceReadyTokens(
    applyTermSynonyms(normalize(raw)).split(SPACE).filter(Boolean),
  );

  const prices = parsePrices(tokens);
  const afterPrices = tokens.filter((_, i) => !prices.consumed.has(i));

  const conditions = extract(afterPrices, (t) => matchPhraseAt(t, CONDITIONS));

  const matcher = categoryMatcher(categories);
  const found = extract(conditions.rest, (t) => matchCategory(t, matcher));
  const slugs = [...new Set(found.values)];
  const [onlySlug] = slugs;
  const single = slugs.length === 1 && onlySlug !== undefined;

  return {
    text: (single ? found.rest : conditions.rest).join(SPACE),
    categorySlug: single ? onlySlug : null,
    condition: conditions.values[0] ?? null,
    priceMin: prices.priceMin,
    priceMax: prices.priceMax,
  };
}
