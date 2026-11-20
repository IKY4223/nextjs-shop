import type { Locale } from "@/lib/i18n/locales";
import type { Category, Facet, Product, SpecValue } from "./types";

export interface YesNo {
  readonly yes: string;
  readonly no: string;
}

const DEFAULT_YES_NO: YesNo = { yes: "✓", no: "—" };

/** Human-readable spec value: enum → its label (or the raw value), number → value + unit, boolean → yes/no. */
export function formatSpecValue(
  facet: Facet,
  value: SpecValue,
  lang: Locale,
  yesNo: YesNo = DEFAULT_YES_NO,
): string {
  if (facet.type === "enum") {
    const option = facet.options.find((o) => o.value === value);
    return option?.label?.[lang] ?? String(value);
  }
  if (facet.type === "number") {
    return facet.unit ? `${value} ${facet.unit[lang]}` : String(value);
  }
  return value === true ? yesNo.yes : yesNo.no;
}

/** Chips for a product card, in the category's `cardFacets` order; specs the product lacks are skipped. */
export function cardChips(
  category: Category,
  product: Product,
  lang: Locale,
): string[] {
  return category.cardFacets.flatMap((key) => {
    const facet = category.facets.find((f) => f.key === key);
    const value = product.specs[key];
    return facet && value !== undefined
      ? [formatSpecValue(facet, value, lang)]
      : [];
  });
}
