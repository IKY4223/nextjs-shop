import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryTile } from "@/components/category-tile";
import { SearchIcon } from "@/components/icons";
import { getCategories, getLeafCategories } from "@/lib/catalog/data";
import type { Category } from "@/lib/catalog/types";
import { localeAlternates } from "@/lib/i18n/alternates";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";

interface CategoryGroup {
  readonly parent: Category | undefined;
  readonly children: readonly Category[];
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.home.title, alternates: localeAlternates(lang, "") };
}

export default async function HomePage({
  params,
}: PageProps<"/[lang]">): Promise<React.JSX.Element> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, categories, leaves] = await Promise.all([
    getDictionary(lang),
    getCategories(),
    getLeafCategories(),
  ]);
  const groups: CategoryGroup[] = [
    ...Map.groupBy(leaves, (c) => c.parentSlug),
  ].map(([parentSlug, children]) => ({
    parent: categories.find((c) => c.slug === parentSlug),
    children,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="py-8 text-center sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          {dict.home.title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">{dict.home.subtitle}</p>
        <button
          type="button"
          data-search-trigger
          className="mx-auto mt-8 flex w-full max-w-xl items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left text-muted shadow-sm hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <SearchIcon className="shrink-0 text-accent" />
          <span className="flex-1 truncate">{dict.home.searchCta}</span>
          <kbd className="hidden rounded bg-chip px-1.5 font-mono text-xs sm:inline">
            {dict.nav.searchHint}
          </kbd>
        </button>
      </section>

      {groups.map((group) => (
        <section key={group.parent?.slug ?? "root"} className="mt-6">
          <h2 className="mb-3 text-sm font-medium tracking-wide text-muted uppercase">
            {group.parent?.name[lang]}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {group.children.map((category) => (
              <CategoryTile
                key={category.slug}
                lang={lang}
                category={category}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
