import { describe, expect, test } from "vitest";
import { categories } from "@/lib/catalog/categories";
import { mockOffers } from "@/lib/catalog/mock/offers";
import { mockProducts } from "@/lib/catalog/mock/products";
import { parseQuery } from "./parse-query";
import { buildSearchIndex, buildSearchUrl, searchProducts } from "./search";

const TOP_THREE = 3;
const DEFAULT_LIMIT = 20;
const LONG_QUERY_LENGTH = 500;
const M5 = 5_000_000;
const GB_32 = 32;

const index = buildSearchIndex(mockProducts, mockOffers, categories);
const specOf = (slug: string, key: string): unknown =>
  mockProducts.find((p) => p.slug === slug)?.specs[key];

const run = (query: string) => {
  const parsed = parseQuery(query, categories);
  const hits = searchProducts(index, parsed);
  return {
    parsed,
    hits,
    slugs: hits.map((h) => h.slug),
    path: buildSearchUrl("uz", parsed, hits).split("?")[0],
  };
};

describe("search eval: top-1 hits", () => {
  test.each([
    ["9800x3d", "amd-ryzen-7-9800x3d"],
    ["ryzen 7 9800 x3d", "amd-ryzen-7-9800x3d"],
    ["i5 12400f", "intel-core-i5-12400f"],
    ["i5-12400F", "intel-core-i5-12400f"],
    ["12400ф", "intel-core-i5-12400f"],
    ["интел 265к", "intel-core-ultra-7-265k"],
    ["rtx 5070", "asus-dual-geforce-rtx-5070"],
    ["ртх 5070", "asus-dual-geforce-rtx-5070"],
    ["джифорс 4060", "msi-geforce-rtx-4060-ventus"],
    ["радеон 9070 xt", "sapphire-pulse-radeon-rx-9070-xt"],
    ["rx 7800xt", "sapphire-pulse-radeon-rx-7800-xt"],
    ["arc b580", "asrock-intel-arc-b580-challenger"],
    ["ona plata am4", "msi-mag-b550-tomahawk"],
    ["мать z890", "asus-prime-z890-p"],
    ["ishlatilgan rtx 4070", "asus-tuf-geforce-rtx-4070-super"],
    ["yangi ryzen 5 9600x", "amd-ryzen-5-9600x"],
    ["бу 5600x", "amd-ryzen-5-5600x"],
    ["g.skill trident", "gskill-trident-z5-rgb-ddr5-32gb-6400"],
    ["джискилл ripjaws", "gskill-ripjaws-v-ddr4-16gb-3600"],
  ])("%j → %s", (query, slug) => {
    expect(run(query).slugs[0]).toBe(slug);
  });
});

describe("search eval: within top 3", () => {
  test.each([
    ["райзен 9800х3д", "amd-ryzen-7-9800x3d"],
    ["core ultra 7", "intel-core-ultra-7-265k"],
    ["kingston 6000", "kingston-fury-beast-ddr5-32gb-6000"],
    ["rtx5070видюха", "asus-dual-geforce-rtx-5070"],
  ])("%j → %s", (query, slug) => {
    expect(run(query).slugs.slice(0, TOP_THREE)).toContain(slug);
  });
});

describe("search eval: categories, conditions, URLs", () => {
  test("видюха → gpu, all hits gpu", () => {
    const r = run("видюха");
    expect(r.parsed.categorySlug).toBe("gpu");
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.hits.every((h) => h.categorySlug === "gpu")).toBe(true);
  });

  test.each([
    ["videokarta", "gpu"],
    ["проц", "cpu"],
    ["процесор", "cpu"],
  ])("%j → category %s", (query, slug) => {
    expect(run(query).parsed.categorySlug).toBe(slug);
  });

  test("видеокарта б/у до 5 млн → gpu, used, max 5M, /uz/c/gpu", () => {
    const r = run("видеокарта б/у до 5 млн");
    expect(r.parsed).toMatchObject({
      categorySlug: "gpu",
      condition: "used",
      priceMax: M5,
    });
    expect(r.path).toBe("/uz/c/gpu");
  });

  test("protsessor am5 → cpu, top 3 all AM5", () => {
    const r = run("protsessor am5");
    expect(r.parsed.categorySlug).toBe("cpu");
    const top = r.slugs.slice(0, TOP_THREE);
    expect(top).toHaveLength(TOP_THREE);
    top.forEach((slug) => expect(specOf(slug, "socket")).toBe("AM5"));
  });

  test("оперативка ddr5 32 → ram, top 1 is a DDR5 32 GB kit", () => {
    const r = run("оперативка ddr5 32");
    expect(r.parsed.categorySlug).toBe("ram");
    const top = r.slugs[0] ?? "";
    expect(specOf(top, "memoryType")).toBe("DDR5");
    expect(specOf(top, "capacity")).toBe(GB_32);
  });

  test("ozu ddr4 → ram, top 3 all DDR4", () => {
    const r = run("ozu ddr4");
    expect(r.parsed.categorySlug).toBe("ram");
    const top = r.slugs.slice(0, TOP_THREE);
    expect(top).toHaveLength(TOP_THREE);
    top.forEach((slug) => expect(specOf(slug, "memoryType")).toBe("DDR4"));
  });

  test("материнка b650 → motherboard, top 1 chipset B650", () => {
    const r = run("материнка b650");
    expect(r.parsed.categorySlug).toBe("motherboard");
    expect(specOf(r.slugs[0] ?? "", "chipset")).toBe("B650");
  });

  test("condition words are parsed", () => {
    expect(run("ishlatilgan rtx 4070").parsed.condition).toBe("used");
    expect(run("yangi ryzen 5 9600x").parsed.condition).toBe("new");
    expect(run("бу 5600x").parsed.condition).toBe("used");
  });

  test("asus spans two categories → /uz/search", () => {
    const r = run("asus");
    expect(new Set(r.hits.map((h) => h.categorySlug)).size).toBeGreaterThan(1);
    expect(r.path).toBe("/uz/search");
  });

  test("sapphire is only gpu → /uz/c/gpu", () => {
    const r = run("sapphire");
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.hits.every((h) => h.categorySlug === "gpu")).toBe(true);
    expect(r.path).toBe("/uz/c/gpu");
  });

  test("rtx5070видюха → gpu", () => {
    expect(run("rtx5070видюха").parsed.categorySlug).toBe("gpu");
  });
});

describe("search eval: robustness", () => {
  test("empty query → no hits", () => {
    expect(run("").hits).toEqual([]);
  });

  test("nonsense → no hits, /uz/search", () => {
    const r = run("zzzzqqqq");
    expect(r.hits).toEqual([]);
    expect(r.path).toBe("/uz/search");
  });

  test("500-char query does not throw and respects the limit", () => {
    expect(run("a".repeat(LONG_QUERY_LENGTH)).hits.length).toBeLessThanOrEqual(
      DEFAULT_LIMIT,
    );
  });

  test("buildSearchUrl puts parsed parts into the query string", () => {
    const parsed = parseQuery("видеокарта б/у до 5 млн rtx", categories);
    expect(buildSearchUrl("ru", parsed, [])).toBe(
      "/ru/c/gpu?condition=used&priceMax=5000000&q=rtx",
    );
  });
});
