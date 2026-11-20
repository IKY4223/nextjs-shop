import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";

/** Photo credits live behind one small link, as the user asked (spec §5). */
export function Footer({
  lang,
  dict,
}: {
  readonly lang: Locale;
  readonly dict: Dictionary;
}): React.JSX.Element {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-muted">
        <span>© Mergo</span>
        <Link
          href={`/${lang}/credits`}
          className="hover:text-text hover:underline"
        >
          {dict.footer.credits}
        </Link>
      </div>
    </footer>
  );
}
