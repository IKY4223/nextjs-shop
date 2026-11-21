/** Replaces the catalog tables with the mock catalog. Run with `npx prisma db seed`. */
import { db } from "../src/lib/db";
import { toOfferRow, toProductRow } from "../src/lib/catalog/db-rows";
import { mockOffers } from "../src/lib/catalog/mock/offers";
import { mockProducts } from "../src/lib/catalog/mock/products";

async function main(): Promise<void> {
  const prisma = db();
  // offers go with their products (onDelete: Cascade); one transaction keeps the catalog whole
  const [, products, offers] = await prisma.$transaction([
    prisma.product.deleteMany(),
    prisma.product.createMany({ data: mockProducts.map(toProductRow) }),
    prisma.offer.createMany({ data: mockOffers.map(toOfferRow) }),
  ]);
  console.log(`seeded ${products.count} products, ${offers.count} offers`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
