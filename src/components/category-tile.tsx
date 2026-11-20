import Link from "next/link";
import type { Category } from "@/lib/catalog/types";
import type { Locale } from "@/lib/i18n/locales";
import { CategoryIcon } from "./category-icon";

export function CategoryTile({
  lang,
  category,
}: {
  readonly lang: Locale;
  readonly category: Category;
}): React.JSX.Element {
  return (
    <Link
      href={`/${lang}/c/${category.slug}`}
      className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <CategoryIcon
        icon={category.icon}
        className="size-12 text-muted group-hover:text-accent"
      />
      <span className="font-medium">{category.name[lang]}</span>
    </Link>
  );
}
