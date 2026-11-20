import { describe, expect, test } from "vitest";
import { cpuCategory, gpuCategory, ramCategory } from "./categories";
import { cardChips, formatSpecValue } from "./format";
import type { Facet, Product } from "./types";

const VRAM_12 = 12;
const SPEED_6000 = 6000;

const facet = (facets: readonly Facet[], key: string): Facet => {
  const found = facets.find((f) => f.key === key);
  if (!found) throw new Error(`no facet ${key}`);
  return found;
};

const gpu: Product = {
  id: "g",
  slug: "g",
  categorySlug: "gpu",
  brand: "ASUS",
  name: "Dual GeForce RTX 5070 12GB",
  specs: { gpuVendor: "NVIDIA", series: "rtx-50", vram: VRAM_12 },
  image: null,
};

describe("formatSpecValue", () => {
  test("enum uses the option label, or the raw value when there is none", () => {
    expect(
      formatSpecValue(facet(gpuCategory.facets, "series"), "rtx-50", "ru"),
    ).toBe("GeForce RTX 50");
    expect(
      formatSpecValue(facet(cpuCategory.facets, "socket"), "AM5", "uz"),
    ).toBe("AM5");
    expect(
      formatSpecValue(facet(cpuCategory.facets, "series"), "core-14", "ru"),
    ).toBe("Core 14-го поколения");
  });

  test("number appends the localized unit", () => {
    expect(
      formatSpecValue(facet(gpuCategory.facets, "vram"), VRAM_12, "ru"),
    ).toBe("12 ГБ");
    expect(
      formatSpecValue(facet(ramCategory.facets, "speed"), SPEED_6000, "uz"),
    ).toBe("6000 MT/s");
  });

  test("boolean is yes/no supplied by the caller's dictionary", () => {
    const igpu = facet(cpuCategory.facets, "igpu");
    expect(formatSpecValue(igpu, true, "ru", { yes: "Да", no: "Нет" })).toBe(
      "Да",
    );
    expect(formatSpecValue(igpu, false, "ru", { yes: "Да", no: "Нет" })).toBe(
      "Нет",
    );
  });

  test("an unknown enum value falls back to the raw value", () => {
    expect(
      formatSpecValue(facet(cpuCategory.facets, "socket"), "AM9", "ru"),
    ).toBe("AM9");
  });
});

describe("cardChips", () => {
  test("follow the category's cardFacets order and skip missing specs", () => {
    expect(cardChips(gpuCategory, gpu, "ru")).toEqual([
      "GeForce RTX 50",
      "12 ГБ",
    ]);
    expect(
      cardChips(gpuCategory, { ...gpu, specs: { series: "rtx-50" } }, "ru"),
    ).toEqual(["GeForce RTX 50"]);
  });
});
