/**
 * Maps a backend category code (PRD §9) to its sprite icon id (assets/sprite.svg).
 * Purely presentational; unknown codes fall back to the generic "other" mark so
 * the category grid never renders a blank tile.
 */
export const CATEGORY_ICON: Record<string, string> = {
  road_damage: "cat-road",
  street_light: "cat-light",
  garbage: "cat-trash",
  water_leak: "cat-water",
  sewage: "cat-sewer",
  damaged_sign: "cat-sign",
  fallen_tree: "cat-tree",
  public_transport: "cat-bus",
  other: "cat-other",
};

export function categoryIcon(code: string): string {
  return CATEGORY_ICON[code] ?? "cat-other";
}
