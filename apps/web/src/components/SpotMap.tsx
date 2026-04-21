"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";

interface MapPoint {
  reference: string | null;
  parkName: string | null;
  lat: string | null;
  lon: string | null;
}

interface Props {
  points: MapPoint[];
  onSelect?: (references: string[], label: string) => void;
}

// Fix default marker icon paths broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export function SpotMap({ points, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      preferCanvas: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clusterGroup = (L as any).markerClusterGroup({ zoomToBoundsOnClick: !onSelect });
    const markerMeta = new Map<L.Marker, { reference: string; label: string }>();

    for (const p of points) {
      if (p.lat == null || p.lon == null) continue;
      const lat = parseFloat(p.lat);
      const lon = parseFloat(p.lon);
      if (isNaN(lat) || isNaN(lon)) continue;
      const marker = L.marker([lat, lon]);
      const label = [p.reference, p.parkName].filter(Boolean).join(" · ");
      if (p.reference) markerMeta.set(marker, { reference: p.reference, label });
      if (onSelect) {
        marker.on("click", () => {
          if (p.reference) onSelect([p.reference], label);
        });
      } else if (p.reference || p.parkName) {
        marker.bindPopup(`<strong>${p.reference ?? ""}</strong><br/>${p.parkName ?? ""}`);
      }
      clusterGroup.addLayer(marker);
    }

    if (onSelect) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clusterGroup.on("clusterclick", (e: any) => {
        const children: L.Marker[] = e.layer.getAllChildMarkers();
        const refs = children.map((m) => markerMeta.get(m)?.reference).filter((r): r is string => !!r);
        const unique = [...new Set(refs)];
        if (unique.length > 0) onSelect(unique, `${unique.length} parks`);
      });
    }

    map.addLayer(clusterGroup);
    return () => { map.removeLayer(clusterGroup); };
  }, [points, onSelect]);

  return (
    <div ref={containerRef} className="w-full rounded-xl overflow-hidden" style={{ height: 400 }} />
  );
}
