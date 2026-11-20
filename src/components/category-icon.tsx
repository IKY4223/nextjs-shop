/** Monochrome category icon drawn as a CSS mask, so it takes the surrounding text colour in both themes. */
export function CategoryIcon({
  icon,
  className = "",
}: {
  readonly icon: string;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={`icon-mask inline-block ${className}`}
      style={{ maskImage: `url(${icon})`, WebkitMaskImage: `url(${icon})` }}
    />
  );
}
