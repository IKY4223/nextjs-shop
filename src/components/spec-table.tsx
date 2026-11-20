import { formatSpecValue } from "@/lib/catalog/format";
import type { Category, Product } from "@/lib/catalog/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";

/** Exactly the category's facets (spec rule: specs = what you can filter by), in config order. */
export function SpecTable({
  lang,
  category,
  product,
  dict,
}: {
  readonly lang: Locale;
  readonly category: Category;
  readonly product: Product;
  readonly dict: Dictionary;
}): React.JSX.Element {
  const yesNo = { yes: dict.catalog.yes, no: dict.catalog.no };
  return (
    <dl className="divide-y divide-border rounded-xl border border-border bg-surface">
      {category.facets.flatMap((facet) => {
        const value = product.specs[facet.key];
        return value === undefined
          ? []
          : [
              <div
                key={facet.key}
                className="flex justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <dt className="text-muted">{facet.label[lang]}</dt>
                <dd className="text-right font-mono">
                  {formatSpecValue(facet, value, lang, yesNo)}
                </dd>
              </div>,
            ];
      })}
    </dl>
  );
}
