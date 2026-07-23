import { useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Draggable map pin for the report flow's location step (PRD §5).
 *
 * Leaflet's bundled default marker icon breaks under a bundler (its PNG paths
 * resolve relative to the CSS, not the JS module). Rather than re-wire those
 * asset URLs, we sidestep the whole problem with a self-contained `divIcon` —
 * the design's cobalt majolica teardrop (matching the #pin-marker sprite),
 * inlined as SVG so it needs no external image asset and tints with the theme.
 */
const pinIcon = L.divIcon({
  className: "sh-mappin",
  html:
    '<svg width="34" height="44" viewBox="0 0 46 58" class="sh-mappin__body" aria-hidden="true">' +
    '<path d="M23 2C11.4 2 2 11.4 2 23c0 13 21 33 21 33s21-20 21-33C44 11.4 34.6 2 23 2Z" fill="var(--co-primary,#143C8C)" stroke="#fff" stroke-width="3"></path>' +
    '<path d="M23 12l4 8 8 .6-6 5.4 2 8-8-4.6-8 4.6 2-8-6-5.4 8-.6z" fill="#fff"></path>' +
    "</svg>",
  iconSize: [34, 44],
  iconAnchor: [17, 44],
});

export interface LocationMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export function LocationMap({ lat, lng, onChange }: LocationMapProps) {
  // The map centres on the initial coordinate once; afterwards the draggable
  // marker drives the value so panning/dragging never fights the state.
  const center = useMemo<[number, number]>(() => [lat, lng], []);

  return (
    <MapContainer
      center={center}
      zoom={16}
      scrollWheelZoom={false}
      className="sh-map"
      aria-label="Xarita"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[lat, lng]}
        icon={pinIcon}
        draggable
        autoPan
        eventHandlers={{
          dragend: (event) => {
            const marker = event.target as L.Marker;
            const pos = marker.getLatLng();
            onChange(pos.lat, pos.lng);
          },
        }}
      />
    </MapContainer>
  );
}

export default LocationMap;
