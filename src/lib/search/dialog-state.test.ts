import { describe, expect, test } from "vitest";
import { categories } from "@/lib/catalog/categories";
import { moveSelection, withoutParts } from "./dialog-state";
import { parseQuery } from "./parse-query";

const FIVE_HITS = 5;
const LAST = 4;
const DOWN = 1;
const UP = -1;

describe("withoutParts", () => {
  const parsed = parseQuery("видюха б/у от 1 до 5 млн rtx", categories);

  test("removes only the chips the user dismissed", () => {
    expect(withoutParts(parsed, new Set(["category"]))).toMatchObject({
      categorySlug: null,
      condition: "used",
      text: "rtx",
    });
    expect(
      withoutParts(parsed, new Set(["priceMin", "condition"])),
    ).toMatchObject({
      priceMin: null,
      condition: null,
      priceMax: parsed.priceMax,
    });
  });

  test("an empty set returns the query unchanged", () => {
    expect(withoutParts(parsed, new Set())).toEqual(parsed);
  });
});

describe("moveSelection", () => {
  test.each<[number | null, 1 | -1, number, number | null]>([
    [null, DOWN, FIVE_HITS, 0],
    [null, UP, FIVE_HITS, LAST],
    [0, DOWN, FIVE_HITS, 1],
    [LAST, DOWN, FIVE_HITS, 0],
    [0, UP, FIVE_HITS, LAST],
    [null, DOWN, 0, null],
    [LAST, DOWN, 1, 0],
  ])("from %s by %s of %s → %s", (current, delta, count, expected) => {
    expect(moveSelection(current, delta, count)).toBe(expected);
  });
});
