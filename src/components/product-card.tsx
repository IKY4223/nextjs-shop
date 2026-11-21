import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import type { ProductListing } from "@/lib/catalog/filters";
import { cardChips } from "@/lib/catalog/format";
import type { Category } from "@/lib/catalog/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { CategoryIcon } from "./category-icon";

const PRICE_PLACEHOLDER = "{price}";

/** The image wrapper's name must match the product page's, so the photo morphs between them. */
export const productImageTransitionName = (slug: string): string =>
  `product-image-${slug}`;

/**
 * Only a navigation tagged with this type morphs the image. Filter changes are untyped, so the grid
 * swaps instantly — animating ~40 named cards on every checkbox click made filtering stutter.
 */
export const PRODUCT_OPEN_TRANSITION = "product-open";
export const productImageShare = {
  [PRODUCT_OPEN_TRANSITION]: "morph",
  default: "none",
} as const;

export function ProductCard({
  lang,
  listing,
  category,
  dict,
}: {
  readonly lang: Locale;
  readonly listing: ProductListing;
  readonly category: Category;
  readonly dict: Dictionary;
}): React.JSX.Element {
  const { product } = listing;
  const from = (price: number): string =>
    dict.catalog.offersFrom.replace(
      PRICE_PLACEHOLDER,
      formatPrice(price, lang),
    );

  return (
    <Link
      href={`/${lang}/p/${product.slug}`}
      transitionTypes={[PRODUCT_OPEN_TRANSITION]}
      className="group flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <ViewTransition
        name={productImageTransitionName(product.slug)}
        share={productImageShare}
        default="none"
      >
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-chip">
          {product.image ? (
            <Image
              src={product.image.src}
              alt={product.image.alt}
              width={400}
              height={300}
              className="h-full w-full object-contain"
            />
          ) : (
            <CategoryIcon icon={category.icon} className="size-16 text-muted" />
          )}
        </div>
      </ViewTransition>
      <p className="mt-3 text-xs text-muted">{product.brand}</p>
      <h2 className="leading-snug font-medium">{product.name}</h2>
      <ul className="mt-2 flex flex-wrap gap-1">
        {cardChips(category, product, lang).map((chip) => (
          <li key={chip} className="rounded bg-chip px-1.5 font-mono text-xs">
            {chip}
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-0.5 pt-3 text-sm">
        {listing.new && (
          <p className="text-accent">
            {dict.catalog.conditionNew} · {listing.new.count} ·{" "}
            <span className="font-semibold">
              {from(listing.new.minPriceUzs)}
            </span>
          </p>
        )}
        {listing.used && (
          <p className="text-used">
            {dict.catalog.conditionUsed} · {listing.used.count} ·{" "}
            <span className="font-semibold">
              {from(listing.used.minPriceUzs)}
            </span>
          </p>
        )}
        <span className="mt-3 block rounded-lg bg-accent px-3 py-1.5 text-center text-sm font-medium text-on-accent">
          {dict.catalog.compare}
        </span>
      </div>
    </Link>
  );
}
