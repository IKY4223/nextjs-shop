import { describe, expect, test } from "vitest";
import { cpuCategory as cpu } from "./categories";
import {
  activeFilterCount,
  filtersHref,
  withBrandToggled,
  withConditionToggled,
  withFacetToggled,
  withPriceRange,
  withSort,
} from "./filter-updates";
import { parseFilters } from "./filters";

const CORES_8 = 8;
const M1 = 1_000_000;
const M3 = 3_000_000;
const FOUR_ACTIVE = 4;

describe("filter updates", () => {
  test("toggling a facet value adds it, toggling again removes the key", () => {
    const base = parseFilters(cpu, {});
    const on = withFacetToggled(base, "socket", "AM5");
    expect(on.facets).toEqual({ socket: ["AM5"] });
    const both = withFacetToggled(on, "socket", "AM4");
    expect(both.facets).toEqual({ socket: ["AM5", "AM4"] });
    expect(withFacetToggled(on, "socket", "AM5").facets).toEqual({});
    expect(withFacetToggled(base, "cores", CORES_8).facets).toEqual({
      cores: [CORES_8],
    });
  });

  test("brand and condition toggles", () => {
    const base = parseFilters(cpu, {});
    expect(withBrandToggled(base, "AMD").brands).toEqual(["AMD"]);
    expect(
      withBrandToggled(withBrandToggled(base, "AMD"), "AMD").brands,
    ).toEqual([]);
    expect(withConditionToggled(base, "used").conditions).toEqual(["used"]);
  });

  test("price range swaps an inverted pair and accepts nulls", () => {
    const base = parseFilters(cpu, {});
    const f = withPriceRange(base, M3, M1);
    expect([f.priceMin, f.priceMax]).toEqual([M1, M3]);
    expect(withPriceRange(f, null, M3).priceMin).toBeNull();
  });

  test("updates never mutate their input", () => {
    const base = parseFilters(cpu, { socket: "AM5" });
    withFacetToggled(base, "socket", "AM4");
    withBrandToggled(base, "AMD");
    expect(base.facets).toEqual({ socket: ["AM5"] });
    expect(base.brands).toEqual([]);
  });

  test("sort and active count", () => {
    const f = parseFilters(cpu, {
      socket: "AM5,AM4",
      brand: "AMD",
      priceMax: "3000000",
    });
    expect(withSort(f, "price-desc").sort).toBe("price-desc");
    expect(activeFilterCount(f)).toBe(FOUR_ACTIVE);
    expect(
      activeFilterCount(parseFilters(cpu, { q: "x", sort: "price-desc" })),
    ).toBe(0);
  });

  test("filtersHref builds the page URL with or without a query string", () => {
    const f = parseFilters(cpu, { socket: "AM5" });
    expect(filtersHref("/ru/c/cpu", f, cpu)).toBe("/ru/c/cpu?socket=AM5");
    expect(filtersHref("/ru/c/cpu", parseFilters(cpu, {}), cpu)).toBe(
      "/ru/c/cpu",
    );
    expect(
      filtersHref("/uz/search", parseFilters(null, { q: "asus" }), null),
    ).toBe("/uz/search?q=asus");
  });
});
