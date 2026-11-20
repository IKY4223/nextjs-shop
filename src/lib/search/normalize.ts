/**
 * Matching form shared by the search index and every query: Latin letters, digits, decimal points, single spaces.
 * The transliteration only has to be consistent, not linguistically perfect: both sides go through it.
 */

interface ScriptRun {
  readonly cyrillic: boolean;
  readonly text: string;
}

const MAX_INPUT_LENGTH = 200;
const MIN_SPLIT_CYRILLIC_RUN = 3;
const CYRILLIC_FIRST = 0x0400;
const CYRILLIC_LAST = 0x04ff;
const SPACE = " ";
const DECIMAL_POINT = ".";

// Uzbek o\u02BB/g\u02BB marks and every apostrophe people type instead of them.
const APOSTROPHES: ReadonlySet<string> = new Set([
  ..."\u02BB\u02BC'\u2018\u2019`",
]);
const DECIMAL_MARKS: ReadonlySet<string> = new Set([".", ","]);

const TRANSLIT: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: "o",
  қ: "q",
  ғ: "g",
  ҳ: "h",
};

function isCyrillic(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= CYRILLIC_FIRST && code <= CYRILLIC_LAST;
}

const isDigit = (ch: string | undefined): boolean =>
  ch !== undefined && ch >= "0" && ch <= "9";

const isLatinOrDigit = (ch: string | undefined): boolean =>
  ch !== undefined && ((ch >= "a" && ch <= "z") || isDigit(ch));

function scriptRuns(chars: readonly string[]): ScriptRun[] {
  return chars.reduce<ScriptRun[]>((runs, ch) => {
    const cyrillic = isCyrillic(ch);
    const last = runs.at(-1);
    return last?.cyrillic === cyrillic
      ? [...runs.slice(0, -1), { cyrillic, text: last.text + ch }]
      : [...runs, { cyrillic, text: ch }];
  }, []);
}

/** "rtx5070видюха" → "rtx5070 видюха"; short Cyrillic suffixes stay attached ("12400ф", "265к", "9800х3д"). */
function splitLongCyrillicRuns(text: string): string {
  const runs = scriptRuns([...text]);
  const isLongCyrillic = (run: ScriptRun): boolean =>
    run.cyrillic && run.text.length >= MIN_SPLIT_CYRILLIC_RUN;
  return runs
    .map((run, i) => {
      const prev = runs[i - 1];
      const needsSpace =
        prev !== undefined &&
        ((isLongCyrillic(run) && isLatinOrDigit(prev.text.at(-1))) ||
          (isLongCyrillic(prev) && isLatinOrDigit(run.text[0])));
      return needsSpace ? SPACE + run.text : run.text;
    })
    .join("");
}

function matchingChar(
  ch: string,
  prev: string | undefined,
  next: string | undefined,
): string {
  if (isLatinOrDigit(ch)) return ch;
  if (DECIMAL_MARKS.has(ch) && isDigit(prev) && isDigit(next))
    return DECIMAL_POINT;
  return SPACE;
}

export function normalize(text: string): string {
  const lowered = text
    .slice(0, MAX_INPUT_LENGTH)
    .normalize("NFKC")
    .toLowerCase();
  const withoutApostrophes = [...lowered]
    .filter((ch) => !APOSTROPHES.has(ch))
    .join("");
  const latin = [...splitLongCyrillicRuns(withoutApostrophes)]
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("");
  const chars = [...latin];
  return chars
    .map((ch, i) => matchingChar(ch, chars[i - 1], chars[i + 1]))
    .join("")
    .split(SPACE)
    .filter(Boolean)
    .join(SPACE);
}

/** normalize() without spaces: "Core i5-12400F" → "corei512400f". */
export function compact(text: string): string {
  return normalize(text).split(SPACE).join("");
}
