import { describe, expect, test } from "vitest";
import { categories } from "../categories";
import type { Product } from "../types";
import { mockOffers } from "./offers";
import { mockProducts } from "./products";

const PRODUCT_COUNT = 39;
const LEAF_SLUGS = ["cpu", "gpu", "motherboard", "ram"];
// real platforms and stores must not appear in invented seller names before release (spec §4)
const BANNED_SELLER_WORDS = [
  "olx",
  "uzum",
  "texnomart",
  "mediapark",
  "asaxiy",
  "wildberries",
  "yandex",
];
const MIN_USED_DISCOUNT = 0.15;
const MAX_USED_DISCOUNT = 0.35;

function specsMatchCategory(p: Product): void {
  const cat = categories.find((c) => c.slug === p.categorySlug);
  expect(cat, p.slug).toBeDefined();
  if (!cat) return;
  expect(Object.keys(p.specs).sort()).toEqual(
    cat.facets.map((f) => f.key).sort(),
  );
  cat.facets.forEach((f) => {
    const v = p.specs[f.key];
    if (f.type === "enum") expect(f.options.map((o) => o.value)).toContain(v);
    if (f.type === "number") expect(f.options).toContain(v);
    if (f.type === "boolean") expect(typeof v).toBe("boolean");
  });
}

const cheapest = (prices: readonly number[]): number => Math.min(...prices);

describe("mock catalog", () => {
  test("39 products with unique ids and slugs in leaf categories", () => {
    expect(mockProducts).toHaveLength(PRODUCT_COUNT);
    expect(new Set(mockProducts.map((p) => p.slug)).size).toBe(PRODUCT_COUNT);
    expect(new Set(mockProducts.map((p) => p.id)).size).toBe(PRODUCT_COUNT);
    mockProducts.forEach((p) => expect(LEAF_SLUGS).toContain(p.categorySlug));
  });

  test("specs match category facets at runtime", () => {
    mockProducts.forEach(specsMatchCategory);
  });

  test("offers reference products with positive integer prices and unique ids", () => {
    const ids = new Set(mockProducts.map((p) => p.id));
    mockOffers.forEach((o) => {
      expect(ids.has(o.productId)).toBe(true);
      expect(Number.isSafeInteger(o.priceUzs) && o.priceUzs > 0).toBe(true);
    });
    expect(new Set(mockOffers.map((o) => o.id)).size).toBe(mockOffers.length);
  });

  test("every product has a new offer; used offers exist", () => {
    mockProducts.forEach((p) =>
      expect(
        mockOffers.some((o) => o.productId === p.id && o.condition === "new"),
        p.slug,
      ).toBe(true),
    );
    expect(mockOffers.some((o) => o.condition === "used")).toBe(true);
  });

  test("used offers are 15-35% below the cheapest new offer", () => {
    mockProducts.forEach((p) => {
      const mine = mockOffers.filter((o) => o.productId === p.id);
      const newPrices = mine
        .filter((o) => o.condition === "new")
        .map((o) => o.priceUzs);
      mine
        .filter((o) => o.condition === "used")
        .forEach((o) => {
          const discount = 1 - o.priceUzs / cheapest(newPrices);
          expect(discount, o.id).toBeGreaterThanOrEqual(MIN_USED_DISCOUNT);
          expect(discount, o.id).toBeLessThanOrEqual(MAX_USED_DISCOUNT);
        });
    });
  });

  test("all three source types appear", () => {
    expect(new Set(mockOffers.map((o) => o.source.type))).toEqual(
      new Set(["store", "telegram", "classified"]),
    );
  });

  test("no real platform or store names in mock sellers", () => {
    mockOffers.forEach((o) => {
      const name = o.source.name.toLowerCase();
      BANNED_SELLER_WORDS.forEach((word) =>
        expect(name.includes(word), o.source.name).toBe(false),
      );
    });
  });
});
