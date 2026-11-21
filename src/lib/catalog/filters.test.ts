import { describe, expect, test } from "vitest";
import { cpuCategory as cpu } from "./categories";
import {
  applyFilters,
  filtersToSearchParams,
  parseFilters,
  summarizeOffers,
} from "./filters";
import type { Condition, Offer, Product } from "./types";

const M1 = 1_000_000;
const M2 = 2_000_000;
const M2_8 = 2_800_000;
const M3 = 3_000_000;
const M4 = 4_000_000;
const M5 = 5_000_000;
const CORES_6 = 6;
const CORES_8 = 8;
const CORES_20 = 20;
const TWO_OFFERS = 2;

const cpuProduct = (
  id: string,
  brand: string,
  socket: string,
  cores: number,
): Product => ({
  id,
  slug: id,
  categorySlug: "cpu",
  brand,
  name: id,
  specs: { socket, series: "ryzen-9000", cores, igpu: true },
  image: null,
});

const p1 = cpuProduct("p1", "AMD", "AM5", CORES_8);
const p2 = cpuProduct("p2", "Intel", "LGA1851", CORES_20);
const p3 = cpuProduct("p3", "AMD", "AM4", CORES_6);

let offerSeq = 0;
const offerAt =
  (condition: Condition) =>
  (p: Product, priceUzs: number): Offer => {
    offerSeq += 1;
    return {
      id: `o${offerSeq}`,
      productId: p.id,
      source: { type: "store", name: "Test" },
      condition,
      priceUzs,
      city: { uz: "Toshkent", ru: "Ташкент" },
      updatedAt: "2026-11-10",
    };
  };
const newAt = offerAt("new");
const usedAt = offerAt("used");

describe("parseFilters", () => {
  test("parses facets, brands, condition, price", () => {
    const f = parseFilters(cpu, {
      socket: "AM5,AM4",
      cores: "8",
      igpu: "1",
      brand: "AMD",
      condition: "used",
      priceMax: "3000000",
    });
    expect(f.facets).toEqual({
      socket: ["AM5", "AM4"],
      cores: [CORES_8],
      igpu: [true],
    });
    expect(f.brands).toEqual(["AMD"]);
    expect(f.conditions).toEqual(["used"]);
    expect(f.priceMax).toBe(M3);
    expect(f.sort).toBe("price-asc");
  });

  test("drops hostile input without throwing", () => {
    const f = parseFilters(cpu, {
      cores: "abc,8",
      socket: "NOPE",
      priceMin: "-5",
      priceMax: "1e30",
      sort: "evil",
      foo: "bar",
      condition: "broken",
    });
    expect(f.facets).toEqual({ cores: [CORES_8] });
    expect(f.priceMin).toBeNull();
    expect(f.priceMax).toBeNull();
    expect(f.sort).toBe("price-asc");
    expect(f.conditions).toEqual([]);
  });

  test("empty strings, decimals and repeated keys", () => {
    const f = parseFilters(cpu, {
      priceMin: "",
      priceMax: "2500000.5",
      socket: ["AM5", "AM4,AM5"],
      brand: " , ",
    });
    expect(f.priceMin).toBeNull();
    expect(f.priceMax).toBeNull();
    expect(f.facets).toEqual({ socket: ["AM5", "AM4"] });
    expect(f.brands).toEqual([]);
  });

  test("swaps an inverted price range", () => {
    const f = parseFilters(null, { priceMin: "5000000", priceMax: "1000000" });
    expect([f.priceMin, f.priceMax]).toEqual([M1, M5]);
  });

  test("ignores facet params when there is no category", () => {
    expect(parseFilters(null, { socket: "AM5" }).facets).toEqual({});
  });

  test("default sort is relevance when there is a query", () => {
    expect(parseFilters(cpu, { q: "x3d" }).sort).toBe("relevance");
    expect(parseFilters(cpu, { q: "x3d", sort: "price-desc" }).sort).toBe(
      "price-desc",
    );
  });
});

describe("filtersToSearchParams", () => {
  test("round-trips in a stable order and omits defaults", () => {
    const f = parseFilters(cpu, { brand: "AMD", socket: "AM4,AM5", q: "x3d" });
    expect(filtersToSearchParams(f, cpu).toString()).toBe(
      "socket=AM4%2CAM5&brand=AMD&q=x3d",
    );
    expect(
      parseFilters(cpu, Object.fromEntries(filtersToSearchParams(f, cpu))),
    ).toEqual(f);
  });

  test("empty filters produce an empty query string", () => {
    expect(filtersToSearchParams(parseFilters(cpu, {}), cpu).toString()).toBe(
      "",
    );
  });

  test("booleans serialize as 1 and non-default sort is kept", () => {
    const f = parseFilters(cpu, { igpu: "1", sort: "price-desc" });
    expect(filtersToSearchParams(f, cpu).toString()).toBe(
      "igpu=1&sort=price-desc",
    );
  });
});

describe("summarizeOffers", () => {
  test("counts and cheapest price per condition", () => {
    expect(
      summarizeOffers([newAt(p1, M2), newAt(p1, M1), usedAt(p1, M2_8)]),
    ).toEqual({
      new: { count: TWO_OFFERS, minPriceUzs: M1 },
      used: { count: 1, minPriceUzs: M2_8 },
    });
    expect(summarizeOffers([])).toEqual({ new: null, used: null });
  });
});

describe("applyFilters", () => {
  test("used + max 3M lists the product by its used offer only (spec §12.8)", () => {
    const listings = applyFilters(
      [p1],
      [newAt(p1, M4), usedAt(p1, M2_8)],
      parseFilters(cpu, { condition: "used", priceMax: "3000000" }),
    );
    expect(listings).toHaveLength(1);
    expect(listings[0]?.new).toBeNull();
    expect(listings[0]?.used).toEqual({ count: 1, minPriceUzs: M2_8 });
  });

  test("a product with no offers or no matching offer is hidden", () => {
    expect(applyFilters([p1], [], parseFilters(cpu, {}))).toEqual([]);
    expect(
      applyFilters(
        [p1],
        [newAt(p1, M4)],
        parseFilters(cpu, { priceMax: "1000000" }),
      ),
    ).toEqual([]);
  });

  test("OR within a facet, AND across facets and brand", () => {
    const offers = [newAt(p1, M1), newAt(p2, M1), newAt(p3, M1)];
    const ids = (params: Record<string, string>): string[] =>
      applyFilters([p1, p2, p3], offers, parseFilters(cpu, params)).map(
        (l) => l.product.id,
      );
    expect(ids({ socket: "AM5,AM4" })).toEqual(["p1", "p3"]);
    expect(ids({ socket: "AM5,AM4", cores: "6" })).toEqual(["p3"]);
    expect(ids({ brand: "Intel" })).toEqual(["p2"]);
    expect(ids({ brand: "Intel", socket: "AM5" })).toEqual([]);
  });

  test("price-desc sorts by the cheapest matching offer", () => {
    const out = applyFilters(
      [p1, p2],
      [newAt(p1, M1), newAt(p2, M2)],
      parseFilters(cpu, { sort: "price-desc" }),
    );
    expect(out.map((l) => l.product.id)).toEqual([p2.id, p1.id]);
  });

  test("relevance keeps the input order", () => {
    const out = applyFilters(
      [p2, p1],
      [newAt(p1, M1), newAt(p2, M2)],
      parseFilters(cpu, { q: "anything" }),
    );
    expect(out.map((l) => l.product.id)).toEqual([p2.id, p1.id]);
  });
});

describe("review minors", () => {
  test("prices must be plain digits (no hex, no exponent)", () => {
    const f = parseFilters(null, { priceMin: "0x10", priceMax: "1e3" });
    expect([f.priceMin, f.priceMax]).toEqual([null, null]);
  });

  test("relevance without a query falls back to the default sort", () => {
    expect(parseFilters(cpu, { sort: "relevance" }).sort).toBe("price-asc");
    expect(parseFilters(cpu, { sort: "relevance", q: "x" }).sort).toBe(
      "relevance",
    );
  });
});
