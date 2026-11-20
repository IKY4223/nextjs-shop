/** Always visible: real model names with invented prices must never pass for a real shop (spec §4). */
export function DemoBanner({
  text,
}: {
  readonly text: string;
}): React.JSX.Element {
  return (
    <p role="note" className="bg-chip px-4 py-1 text-center text-xs text-muted">
      {text}
    </p>
  );
}
