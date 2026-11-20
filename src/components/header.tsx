import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";
import { SearchIcon } from "./icons";
import { LangSwitch } from "./lang-switch";
import { ThemeToggle } from "./theme-toggle";

/** The search button carries data-search-trigger; the Ctrl+K dialog attaches to every such element. */
export function Header({
  lang,
  dict,
}: {
  readonly lang: Locale;
  readonly dict: Dictionary;
}): React.JSX.Element {
  return (
    <header
      className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4">
        <Link
          href={`/${lang}`}
          aria-label={dict.nav.home}
          className="text-xl font-extrabold tracking-tight"
        >
          mer<span className="text-accent">go</span>
        </Link>
        <button
          type="button"
          data-search-trigger
          className="ml-auto flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-muted bg-bg px-3 py-1.5 text-sm text-muted hover:border-accent focus-visible:outline-2 focus-visible:outline-accent sm:ml-4 sm:max-w-md"
        >
          <SearchIcon className="shrink-0" />
          <span className="flex-1 truncate text-left">{dict.nav.search}</span>
          <kbd className="hidden rounded bg-chip px-1.5 font-mono text-xs sm:inline">
            {dict.nav.searchHint}
          </kbd>
        </button>
        <LangSwitch
          lang={lang}
          label={dict.lang.switch}
          ariaLabel={dict.lang.switchLabel}
        />
        <ThemeToggle label={dict.theme.toggle} />
      </div>
    </header>
  );
}
