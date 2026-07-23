import type { CSSProperties } from "react";

/**
 * Renders one symbol from the inline SVG sprite (assets/sprite.svg, injected
 * once by <App/>). Purely presentational and decorative — always aria-hidden;
 * callers provide their own accessible labels/text.
 *
 * Symbols draw with `currentColor` (colour follows the element's CSS `color`)
 * or the themed `--co-*` custom properties, so icons flip with light/dark.
 */
export interface IconProps {
  /** Symbol id in the sprite, e.g. "ic-camera", "logo-mark", "cat-road". */
  id: string;
  /** Square size in px (default 24). */
  size?: number;
  /** Override the symbol's viewBox (e.g. the map pin uses "0 0 46 58"). */
  viewBox?: string;
  className?: string;
  style?: CSSProperties;
}

export function Icon({
  id,
  size = 24,
  viewBox = "0 0 24 24",
  className,
  style,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#${id}`} />
    </svg>
  );
}

export default Icon;
