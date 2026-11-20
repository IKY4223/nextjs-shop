import Link from "next/link";
import type { Category } from "@/lib/catalog/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";

/** Home › … › current; built from the category tree, so any depth works. */
export function Breadcrumbs({
  lang,
  crumbs,
  dict,
  current,
}: {
  readonly lang: Locale;
  readonly crumbs: readonly Category[];
  readonly dict: Dictionary;
  /** Extra last crumb that is not a category (e.g. a product name). */
  readonly current?: string;
}): React.JSX.Element {
  const links = [
    { href: `/${lang}`, label: dict.catalog.home },
    ...crumbs.map((c) => ({
      href: `/${lang}/c/${c.slug}`,
      label: c.name[lang],
    })),
  ];
  const last = current ?? links.at(-1)?.label;
  const ancestors = current ? links : links.slice(0, -1);
  return (
    <nav aria-label={dict.catalog.breadcrumbs} className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {ancestors.map((link) => (
          <li key={link.href} className="flex items-center gap-1">
            <Link href={link.href} className="hover:text-text hover:underline">
              {link.label}
            </Link>
            <span aria-hidden>›</span>
          </li>
        ))}
        <li aria-current="page" className="text-text">
          {last}
        </li>
      </ol>
    </nav>
  );
}
