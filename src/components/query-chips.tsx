import Link from "next/link";
import {
  removableFilterLinks,
  type RemovablePart,
} from "@/lib/catalog/filter-updates";
import type { Filters } from "@/lib/catalog/filters";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

const PRICE_PLACEHOLDER = "{price}";

/** Active search filters as chips; each one links to the same page without it. */
export function QueryChips({
  lang,
  basePath,
  filters,
  dict,
}: {
  readonly lang: Locale;
  readonly basePath: string;
  readonly filters: Filters;
  readonly dict: Dictionary;
}): React.JSX.Element | null {
  const links = removableFilterLinks(basePath, filters);
  if (!links.length) return null;
  const price = (template: string, amount: number | null): string =>
    template.replace(PRICE_PLACEHOLDER, formatPrice(amount ?? 0, lang));
  const labels: Readonly<Record<RemovablePart, string>> = {
    condition: filters.conditions
      .map((c) =>
        c === "new" ? dict.catalog.conditionNew : dict.catalog.conditionUsed,
      )
      .join(", "),
    priceMin: price(dict.search.priceMin, filters.priceMin),
    priceMax: price(dict.search.priceMax, filters.priceMax),
    q: `${dict.search.query}: «${filters.q}»`,
  };

  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={link.part}>
          <Link
            href={link.href}
            aria-label={`${dict.search.remove}: ${labels[link.part]}`}
            className="inline-block rounded-full bg-chip px-3 py-1 text-sm hover:text-accent"
          >
            {labels[link.part]} <span aria-hidden>✕</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
