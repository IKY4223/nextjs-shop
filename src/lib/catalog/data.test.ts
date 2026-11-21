import { describe, expect, test } from "vitest";
import {
  getBreadcrumbs,
  getCategory,
  getCategoryBrands,
  getChildCategories,
  getLeafCategories,
  getOffer,
  getOfferIds,
  getPhotoCredits,
  getProduct,
  getProductSlugs,
  getSearchIndex,
  listProducts,
} from "./data";
import { parseFilters } from "./filters";

const PRODUCT_COUNT = 39;

describe("data layer", () => {
  test("unknown slugs and ids resolve to null or empty", async () => {
    expect(await getCategory("phones")).toBeNull();
    expect(await getProduct("nope")).toBeNull();
    expect(await getOffer("nope")).toBeNull();
    expect(await getBreadcrumbs("phones")).toEqual([]);
    expect(await getCategoryBrands("phones")).toEqual([]);
    expect(await listProducts("phones", parseFilters(null, {}))).toEqual([]);
  });

  test("category tree navigation", async () => {
    expect((await getBreadcrumbs("cpu")).map((c) => c.slug)).toEqual([
      "electronics",
      "pc-components",
      "cpu",
    ]);
    expect((await getChildCategories(null)).map((c) => c.slug)).toEqual([
      "electronics",
    ]);
    expect(
      (await getChildCategories("pc-components")).map((c) => c.slug),
    ).toEqual(["cpu", "gpu", "motherboard", "ram"]);
    expect((await getLeafCategories()).map((c) => c.slug).sort()).toEqual([
      "cpu",
      "gpu",
      "motherboard",
      "ram",
    ]);
  });

  test("listProducts filters by facet", async () => {
    const cpu = await getCategory("cpu");
    expect(cpu).not.toBeNull();
    const am4 = await listProducts("cpu", parseFilters(cpu, { socket: "AM4" }));
    expect(am4.map((l) => l.product.slug).sort()).toEqual([
      "amd-ryzen-5-5600x",
      "amd-ryzen-7-5700x3d",
    ]);
  });

  test("listProducts with q keeps search relevance order", async () => {
    const cpu = await getCategory("cpu");
    const hits = await listProducts("cpu", parseFilters(cpu, { q: "9800x3d" }));
    expect(hits[0]?.product.slug).toBe("amd-ryzen-7-9800x3d");
  });

  test("listProducts(null) searches every category", async () => {
    const all = await listProducts(null, parseFilters(null, {}));
    expect(all).toHaveLength(PRODUCT_COUNT);
    const asus = await listProducts(null, parseFilters(null, { q: "asus" }));
    expect(
      new Set(asus.map((l) => l.product.categorySlug)).size,
    ).toBeGreaterThan(1);
  });

  test("a parent category covers its whole subtree", async () => {
    // the page decides whether to show a grid; the data layer always answers for the subtree
    expect(
      await listProducts("pc-components", parseFilters(null, {})),
    ).toHaveLength(PRODUCT_COUNT);
  });

  test("getProduct returns category and every offer sorted by price", async () => {
    const detail = await getProduct("amd-ryzen-7-9800x3d");
    expect(detail?.category.slug).toBe("cpu");
    const prices = detail?.offers.map((o) => o.priceUzs) ?? [];
    expect(prices.length).toBeGreaterThan(1);
    expect(prices).toEqual(prices.toSorted((a, b) => a - b));
    expect(new Set(detail?.offers.map((o) => o.condition))).toEqual(
      new Set(["new", "used"]),
    );
  });

  test("getOffer returns the offer with its product", async () => {
    const [firstId] = await getOfferIds();
    const found = await getOffer(firstId ?? "");
    expect(found?.offer.id).toBe(firstId);
    expect(found?.product.id).toBe(found?.offer.productId);
  });

  test("brands are unfiltered and sorted", async () => {
    expect(await getCategoryBrands("cpu")).toEqual(["AMD", "Intel"]);
  });

  test("static-params helpers and index cover the whole catalog", async () => {
    expect(await getProductSlugs()).toHaveLength(PRODUCT_COUNT);
    expect(await getSearchIndex()).toHaveLength(PRODUCT_COUNT);
    expect(await getPhotoCredits()).toEqual([]);
  });
});

describe("review fix: parent categories cover their subtree", () => {
  const ASUS_PRODUCTS = 5;

  test("listProducts on a parent with q searches every descendant", async () => {
    const parent = await getCategory("pc-components");
    const hits = await listProducts(
      "pc-components",
      parseFilters(parent, { q: "asus" }),
    );
    expect(hits).toHaveLength(ASUS_PRODUCTS);
  });

  test("brands of a parent include every descendant's brands", async () => {
    const brands = await getCategoryBrands("pc-components");
    expect(brands).toContain("AMD");
    expect(brands).toContain("Kingston");
    expect(brands).toContain("Sapphire");
  });
});
