/** Pure mapping between the domain types and Prisma rows; shared by the seed and the data layer. */
import type {
  Condition as DbCondition,
  Offer as OfferModel,
  OfferSourceType as DbSourceType,
  Product as ProductModel,
} from "@/generated/prisma/client";
import type {
  Condition,
  Offer,
  OfferSourceType,
  Product,
  ProductImage,
  SpecValue,
} from "./types";

type SpecMap = Readonly<Record<string, SpecValue>>;

/** Product columns without the DB-managed timestamps; `specs` narrowed so it also fits Prisma's input JSON type. */
export type ProductRow = Omit<
  ProductModel,
  "createdAt" | "updatedAt" | "specs"
> & { readonly specs: SpecMap };
export type OfferRow = Omit<OfferModel, "createdAt">;

/** "2026-11-12" is the length of an ISO date without the time part. */
const ISO_DATE_LENGTH = 10;

const CONDITION_TO_DB: Readonly<Record<Condition, DbCondition>> = {
  new: "NEW",
  used: "USED",
};
const CONDITION_FROM_DB: Readonly<Record<DbCondition, Condition>> = {
  NEW: "new",
  USED: "used",
};
const SOURCE_TO_DB: Readonly<Record<OfferSourceType, DbSourceType>> = {
  store: "STORE",
  telegram: "TELEGRAM",
  classified: "CLASSIFIED",
};
const SOURCE_FROM_DB: Readonly<Record<DbSourceType, OfferSourceType>> = {
  STORE: "store",
  TELEGRAM: "telegram",
  CLASSIFIED: "classified",
};

export function toProductRow(product: Product): ProductRow {
  const { image } = product;
  return {
    id: product.id,
    slug: product.slug,
    categorySlug: product.categorySlug,
    brand: product.brand,
    name: product.name,
    specs: product.specs,
    imageSrc: image?.src ?? null,
    imageAlt: image?.alt ?? null,
    imageAuthor: image?.author ?? null,
    imageLicense: image?.license ?? null,
    imageLicenseUrl: image?.licenseUrl ?? null,
    imageSourceUrl: image?.sourceUrl ?? null,
  };
}

export function fromProductRow(
  row: Omit<ProductModel, "createdAt" | "updatedAt">,
): Product {
  const image: ProductImage | null = row.imageSrc
    ? {
        src: row.imageSrc,
        alt: row.imageAlt ?? "",
        author: row.imageAuthor ?? "",
        // only the seed and (later) the admin write this column, both from the same union
        license: (row.imageLicense ?? "CC0") as ProductImage["license"],
        licenseUrl: row.imageLicenseUrl ?? "",
        sourceUrl: row.imageSourceUrl ?? "",
      }
    : null;
  return {
    id: row.id,
    slug: row.slug,
    categorySlug: row.categorySlug,
    brand: row.brand,
    name: row.name,
    // written by toProductRow from facet-checked specs; Prisma types it as any JSON
    specs: row.specs as SpecMap,
    image,
  };
}

export function toOfferRow(offer: Offer): OfferRow {
  return {
    id: offer.id,
    productId: offer.productId,
    sourceType: SOURCE_TO_DB[offer.source.type],
    sourceName: offer.source.name,
    condition: CONDITION_TO_DB[offer.condition],
    priceUzs: BigInt(offer.priceUzs),
    cityUz: offer.city.uz,
    cityRu: offer.city.ru,
    url: null,
    updatedAt: new Date(offer.updatedAt),
  };
}

export function fromOfferRow(row: OfferRow): Offer {
  return {
    id: row.id,
    productId: row.productId,
    source: { type: SOURCE_FROM_DB[row.sourceType], name: row.sourceName },
    condition: CONDITION_FROM_DB[row.condition],
    // UZS prices stay far below Number.MAX_SAFE_INTEGER (9e15) even for cars
    priceUzs: Number(row.priceUzs),
    city: { uz: row.cityUz, ru: row.cityRu },
    updatedAt: row.updatedAt.toISOString().slice(0, ISO_DATE_LENGTH),
  };
}
