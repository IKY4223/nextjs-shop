const SKELETON_CARDS = 6;

/** Suspense fallback for product grids: part of the static shell while the listing streams. */
export function GridSkeleton(): React.JSX.Element {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: SKELETON_CARDS }, (_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-xl bg-chip" />
      ))}
    </div>
  );
}
