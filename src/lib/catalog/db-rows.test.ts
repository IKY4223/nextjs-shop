import { describe, expect, test } from "vitest";
import {
  fromOfferRow,
  fromProductRow,
  toOfferRow,
  toProductRow,
} from "./db-rows";
import { mockOffers } from "./mock/offers";
import { mockProducts } from "./mock/products";
import type { Product } from "./types";

describe("db rows", () => {
  test("every mock product and offer survives a round trip through its row", () => {
    expect(mockProducts.map((p) => fromProductRow(toProductRow(p)))).toEqual(
      mockProducts,
    );
    expect(mockOffers.map((o) => fromOfferRow(toOfferRow(o)))).toEqual(
      mockOffers,
    );
  });

  test("an image keeps all its credit fields", () => {
    const [first] = mockProducts;
    if (!first) throw new Error("no mock products");
    const withImage: Product = {
      ...first,
      image: {
        src: "/photos/x.jpg",
        alt: "x",
        author: "A. Author",
        license: "CC BY-SA",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:X.jpg",
      },
    };
    expect(fromProductRow(toProductRow(withImage))).toEqual(withImage);
  });

  test("enums and prices use the DB representation", () => {
    const [offer] = mockOffers;
    if (!offer) throw new Error("no mock offers");
    const row = toOfferRow(offer);
    expect(row.condition).toBe(offer.condition.toUpperCase());
    expect(row.sourceType).toBe(offer.source.type.toUpperCase());
    expect(row.priceUzs).toBe(BigInt(offer.priceUzs));
  });
});
