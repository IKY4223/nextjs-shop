import { describe, expect, test } from "vitest";
import { categories, RESERVED_PARAMS } from "./categories";
import type { Category } from "./types";

const MAX_CARD_FACETS = 3;
const MIN_LEAF_FACETS = 3;
const MAX_LEAF_FACETS = 5;

const facetKeys = (c: Category): string[] => c.facets.map((f) => f.key);
const isLeaf = (c: Category): boolean =>
  !categories.some((x) => x.parentSlug === c.slug);

/** Walks parent links from `c`; returns false if a slug repeats (a cycle). */
function reachesRootWithoutCycle(c: Category): boolean {
  const visit = (
    cur: Category | undefined,
    seen: ReadonlySet<string>,
  ): boolean =>
    !cur?.parentSlug ||
    (!seen.has(cur.slug) &&
      visit(
        categories.find((x) => x.slug === cur.parentSlug),
        new Set([...seen, cur.slug]),
      ));
  return visit(c, new Set());
}

describe("category config", () => {
  test("slugs are unique and every parent exists", () => {
    const slugs = categories.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    categories
      .filter((c) => c.parentSlug)
      .forEach((c) => expect(slugs).toContain(c.parentSlug));
  });

  test("facet keys are unique per category and not reserved URL params", () => {
    categories.forEach((c) => {
      const keys = facetKeys(c);
      expect(new Set(keys).size).toBe(keys.length);
      keys.forEach((k) => expect(RESERVED_PARAMS).not.toContain(k));
    });
  });

  test("cardFacets reference existing facets, at most 3", () => {
    categories.forEach((c) => {
      expect(c.cardFacets.length).toBeLessThanOrEqual(MAX_CARD_FACETS);
      c.cardFacets.forEach((k) => expect(facetKeys(c)).toContain(k));
    });
  });

  test("the leaves are the four stage-1 categories with 3-5 facets each", () => {
    const leaves = categories.filter(isLeaf);
    expect(leaves.map((c) => c.slug).sort()).toEqual([
      "cpu",
      "gpu",
      "motherboard",
      "ram",
    ]);
    leaves.forEach((c) => {
      expect(c.facets.length).toBeGreaterThanOrEqual(MIN_LEAF_FACETS);
      expect(c.facets.length).toBeLessThanOrEqual(MAX_LEAF_FACETS);
    });
  });

  test("the tree has no cycles", () => {
    expect(categories.every(reachesRootWithoutCycle)).toBe(true);
  });

  test("every category has search synonyms and an icon", () => {
    categories.forEach((c) => {
      expect(c.searchSynonyms.length).toBeGreaterThan(0);
      expect(c.icon.startsWith("/categories/")).toBe(true);
      expect(c.icon.endsWith(".svg")).toBe(true);
    });
  });
});
