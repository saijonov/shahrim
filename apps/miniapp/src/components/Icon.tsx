import type { CSSProperties } from "react";
import spriteMarkup from "../assets/sprite.svg?raw";

/**
 * Renders one icon from the SVG sprite. We INLINE the symbol's contents into the
 * <svg> (rather than <use href="#id">), because Telegram's iOS webview (WKWebView)
 * fails to paint `<use>`-referenced symbols that rely on `currentColor`. Inline
 * `currentColor` / `--co-*` fills resolve correctly everywhere. Icons stay
 * decorative (aria-hidden); callers provide their own accessible labels.
 */

interface SpriteSymbol {
  viewBox: string;
  inner: string;
}

const SYMBOLS: Record<string, SpriteSymbol> = (() => {
  const map: Record<string, SpriteSymbol> = {};
  const re = /<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(spriteMarkup)) !== null) {
    const id = /id="([^"]+)"/.exec(m[1])?.[1];
    const viewBox = /viewBox="([^"]+)"/.exec(m[1])?.[1] ?? "0 0 24 24";
    if (id) map[id] = { viewBox, inner: m[2] };
  }
  return map;
})();

export interface IconProps {
  /** Symbol id in the sprite, e.g. "ic-camera", "logo-mark", "cat-road". */
  id: string;
  /** Square size in px (default 24). */
  size?: number;
  /** Override the symbol's viewBox. */
  viewBox?: string;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ id, size = 24, viewBox, className, style }: IconProps) {
  const sym = SYMBOLS[id];
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox ?? sym?.viewBox ?? "0 0 24 24"}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={sym ? { __html: sym.inner } : undefined}
    />
  );
}

export default Icon;
