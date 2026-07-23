import { useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { urgencyColor } from "./lib/status";
import { HeatLayer } from "./HeatLayer";
import type { MapPoint } from "./api";

// Samarkand city centre — the default map view (PRD §7, §13).
const SAMARKAND: [number, number] = [39.6542, 66.9597];

/**
 * A self-contained teardrop divIcon coloured by urgency. Using divIcon sidesteps
 * Leaflet's broken default-marker asset paths under a bundler entirely.
 */
function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "adm-pin",
    html: `<span class="adm-pin__body" style="background:${color}"></span>`,
    iconSize: [26, 36],
    iconAnchor: [13, 36],
  });
}

export interface IssueMapProps {
  points: MapPoint[];
  onSelect: (id: number) => void;
}

/**
 * City map (PRD §7): OSM tiles, a heatmap layer for density, and urgency-coloured
 * pins. Clicking a pin opens that issue's detail.
 */
export function IssueMap({ points, onSelect }: IssueMapProps) {
  const heatPoints = useMemo<Array<[number, number, number]>>(
    () =>
      points.map((p) => [
        p.lat,
        p.lng,
        // Weight the heat by urgency so hotspots reflect severity, not just count.
        p.urgency === "high" ? 1 : p.urgency === "medium" ? 0.66 : 0.4,
      ]),
    [points],
  );

  return (
    <MapContainer center={SAMARKAND} zoom={12} scrollWheelZoom className="adm-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <HeatLayer points={heatPoints} />
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(urgencyColor(p.urgency))}
          eventHandlers={{ click: () => onSelect(p.id) }}
        />
      ))}
    </MapContainer>
  );
}

export default IssueMap;
