import { useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Draggable map pin for the report flow's location step (PRD §5).
 *
 * Leaflet's bundled default marker icon breaks under a bundler (its PNG paths
 * resolve relative to the CSS, not the JS module). Rather than re-wire those
 * asset URLs, we sidestep the whole problem with a self-contained `divIcon` — a
 * cobalt teardrop styled in CSS (.sh-mappin). No external image assets needed.
 */
const pinIcon = L.divIcon({
  className: "sh-mappin",
  html: '<span class="sh-mappin__body"></span>',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
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
