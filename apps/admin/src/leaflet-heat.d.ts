// Type surface for `leaflet.heat`, which ships no bundled types. Importing the
// package for its side effect attaches `L.heatLayer`; this augments the leaflet
// module so the heatmap layer (Dashboard map) type-checks.
import "leaflet";

declare module "leaflet" {
  interface HeatMapOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: { [stop: number]: string };
  }

  type HeatLatLngTuple = [number, number, number?];

  class HeatLayer extends Layer {
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    addLatLng(latlng: HeatLatLngTuple): this;
    setOptions(options: HeatMapOptions): this;
  }

  function heatLayer(latlngs: HeatLatLngTuple[], options?: HeatMapOptions): HeatLayer;
}

declare module "leaflet.heat";
