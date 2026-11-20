import type { Localized } from "@/lib/i18n/locales";

/** One selectable value of an enum facet; without `label` the value is shown as is ("AM5"). */
export interface FacetOption {
  readonly value: string;
  readonly label?: Localized;
}

export type Facet =
  | {
      readonly key: string;
      readonly label: Localized;
      readonly type: "enum";
      readonly options: readonly FacetOption[];
    }
  | {
      readonly key: string;
      readonly label: Localized;
      readonly type: "number";
      readonly unit?: Localized;
      readonly options: readonly number[];
    }
  | {
      readonly key: string;
      readonly label: Localized;
      readonly type: "boolean";
    };

export interface Category {
  readonly slug: string;
  readonly name: Localized;
  readonly parentSlug: string | null;
  /** Path under /public, e.g. "/categories/cpu.svg". */
  readonly icon: string;
  readonly facets: readonly Facet[];
  /** Facet keys shown as chips on product cards (max 3). */
  readonly cardFacets: readonly string[];
  /** Written naturally (ru, uz, slang); search normalizes them at runtime. */
  readonly searchSynonyms: readonly string[];
}

export type SpecValue = string | number | boolean;

/** The specs object a facet list allows — mocks use it with `satisfies`, so a wrong key or value fails the build. */
export type SpecsFor<TFacets extends readonly Facet[]> = {
  [TFacet in TFacets[number] as TFacet["key"]]: TFacet extends {
    readonly type: "enum";
    readonly options: readonly (infer TOption)[];
  }
    ? TOption extends { readonly value: infer TValue }
      ? TValue
      : never
    : TFacet extends {
          readonly type: "number";
          readonly options: readonly (infer TNumber)[];
        }
      ? TNumber
      : boolean;
};

export interface ProductImage {
  readonly src: string;
  readonly alt: string;
  readonly author: string;
  readonly license: "CC0" | "CC BY" | "CC BY-SA";
  readonly licenseUrl: string;
  readonly sourceUrl: string;
}

export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly categorySlug: string;
  readonly brand: string;
  readonly name: string;
  readonly specs: Readonly<Record<string, SpecValue>>;
  readonly image: ProductImage | null;
}

export type Condition = "new" | "used";

export type OfferSourceType = "store" | "telegram" | "classified";

/** Stage 1 has no `url`: every seller link is /{lang}/go/{offer.id}. */
export interface Offer {
  readonly id: string;
  readonly productId: string;
  readonly source: { readonly type: OfferSourceType; readonly name: string };
  readonly condition: Condition;
  readonly priceUzs: number;
  readonly city: Localized;
  /** ISO date, e.g. "2026-11-12". */
  readonly updatedAt: string;
}
