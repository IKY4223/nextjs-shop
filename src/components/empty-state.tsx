import Link from "next/link";

/** Shown instead of an empty grid: says why, and offers the way back to every product. */
export function EmptyState({
  title,
  text,
  resetLabel,
  resetHref,
}: {
  readonly title: string;
  readonly text: string;
  readonly resetLabel: string;
  readonly resetHref: string;
}): React.JSX.Element {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted">{text}</p>
      <Link
        href={resetHref}
        className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent"
      >
        {resetLabel}
      </Link>
    </div>
  );
}
