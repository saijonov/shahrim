import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
// Side-effect import: attaches L.heatLayer (typed in leaflet-heat.d.ts).
import "leaflet.heat";

export interface HeatLayerProps {
  /** [lat, lng, intensity] tuples. */
  points: Array<[number, number, number]>;
}

/**
 * Thin wrapper around leaflet.heat's `L.heatLayer`. It grabs the parent map via
 * useMap(), adds the heat layer, and removes it on unmount / when the points
 * change — so density updates cleanly as filters change (PRD §7 heatmap).
 */
export function HeatLayer({ points }: HeatLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const layer = L.heatLayer(points, {
      radius: 24,
      blur: 18,
      maxZoom: 17,
      minOpacity: 0.35,
    }).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, points]);

  return null;
}

export default HeatLayer;
