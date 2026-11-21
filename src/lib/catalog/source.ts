/** Where the raw catalog comes from: Neon via Prisma, or the mocks when CATALOG_SOURCE=mock (tests, CI). */
import { db } from "@/lib/db";
import { fromOfferRow, fromProductRow } from "./db-rows";
import { mockOffers } from "./mock/offers";
import { mockProducts } from "./mock/products";
import type { Offer, Product } from "./types";

export interface CatalogRows {
  readonly products: readonly Product[];
  readonly offers: readonly Offer[];
}

const MOCK_SOURCE = "mock";

export async function loadCatalogRows(): Promise<CatalogRows> {
  // explicit opt-in only: a missing DATABASE_URL in production must fail, not silently show mocks
  if (process.env["CATALOG_SOURCE"] === MOCK_SOURCE)
    return { products: mockProducts, offers: mockOffers };
  // shortcut: loads the whole catalog (39 products), fine while it fits in memory; page in SQL past a few thousand
  const products = await db().product.findMany({
    omit: { createdAt: true, updatedAt: true },
    include: { offers: { omit: { createdAt: true }, orderBy: { id: "asc" } } },
    orderBy: { id: "asc" },
  });
  return {
    products: products.map(fromProductRow),
    offers: products.flatMap((p) => p.offers.map(fromOfferRow)),
  };
}
