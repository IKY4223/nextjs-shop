import Link from "next/link";
import type { Offer } from "@/lib/catalog/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatDate, formatPrice } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

/** Every offer, cheapest first (the data layer sorts). Seller links go to the internal demo stub before release (spec §4). */
export function OfferList({
  lang,
  offers,
  dict,
}: {
  readonly lang: Locale;
  readonly offers: readonly Offer[];
  readonly dict: Dictionary;
}): React.JSX.Element {
  if (!offers.length) {
    return <p className="text-muted">{dict.product.noOffers}</p>;
  }
  const conditionLabel = {
    new: dict.catalog.conditionNew,
    used: dict.catalog.conditionUsed,
  } as const;
  const conditionClass = { new: "text-accent", used: "text-used" } as const;

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {offers.map((offer) => (
        <li
          key={offer.id}
          className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 p-4 sm:grid-cols-[1fr_auto_auto]"
        >
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-chip px-1.5 text-xs text-muted">
                {dict.product.source[offer.source.type]}
              </span>
              <span className="truncate font-medium">{offer.source.name}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              <span className={conditionClass[offer.condition]}>
                {conditionLabel[offer.condition]}
              </span>
              {" · "}
              {offer.city[lang]}
              {" · "}
              {dict.product.updated} {formatDate(offer.updatedAt, lang)}
            </p>
          </div>
          <p className="text-right font-semibold whitespace-nowrap">
            {formatPrice(offer.priceUzs, lang)}
          </p>
          <Link
            href={`/${lang}/go/${offer.id}`}
            className="col-span-2 rounded-lg border border-accent px-3 py-1.5 text-center text-sm text-accent hover:bg-accent hover:text-on-accent sm:col-span-1"
          >
            {dict.product.goToSeller}
          </Link>
        </li>
      ))}
    </ul>
  );
}
